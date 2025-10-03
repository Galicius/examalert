from __future__ import annotations

import os
import re
import time
import random
from datetime import datetime, timedelta
from typing import Optional, Tuple, List, Dict
from zoneinfo import ZoneInfo
from urllib.parse import urlencode

import httpx
from bs4 import BeautifulSoup
from tenacity import retry, stop_after_attempt, wait_exponential

from storage import init_db, upsert_slots  # your own module for storage logic

LOCAL_TZ = ZoneInfo("Europe/Ljubljana")

# -------------------- Config --------------------
BASE = "https://e-uprava.gov.si"
MAIN = f"{BASE}/javne-evidence/prosti-termini.html?lang=si"
AJAX = f"{BASE}/si/javne-evidence/prosti-termini/content/singleton.html"

MAX_PAGES = 300              # hard safety cap
MAX_DAYS_AHEAD = 30          # stop when a slot's date is beyond this many days
REQUEST_PAUSE = (0.6, 1.1)   # random sleep range between pages (seconds)

DEBUG = os.getenv("DEBUG", "0") == "1"
OUTDIR = os.getenv("OUTDIR", "/tmp/debug_pages")
if DEBUG:
    os.makedirs(OUTDIR, exist_ok=True)

# -------------------- Utils --------------------
def _norm_space(s: str) -> str:
    return " ".join(s.replace("\xa0", " ").split())

def _soup(html: str) -> BeautifulSoup:
    try:
        return BeautifulSoup(html, "lxml")
    except Exception:
        return BeautifulSoup(html, "html.parser")

def _text(el) -> str:
    return " ".join(el.get_text(" ", strip=True).split()) if el else ""

def _compose_location(obmocje: Optional[int], town: Optional[str]) -> Optional[str]:
    if obmocje is None and not town:
        return None
    if obmocje is not None and town:
        return f"Območje {obmocje} , {town}"
    if obmocje is not None:
        return f"Območje {obmocje}"
    return town

# -------------------- Field parsers --------------------
def _parse_places_left(node) -> Optional[int]:
    banner = node.select_one("div.contentOpomnik .lessImportant.green")
    if not banner:
        return None
    txt = _norm_space(banner.get_text(" ", strip=True))
    m = re.search(r"Še\s+(\d+)\s+", txt, re.IGNORECASE)
    return int(m.group(1)) if m else None

def _parse_exam_type(node) -> Optional[str]:
    co = node.select_one("div.contentOpomnik")
    if not co:
        return None
    t = _text(co).lower()
    if "preverjanje znanja vožnje" in t:
        return "voznja"
    if "preverjanje znanja teorije" in t:
        return "teorija"
    return None

def _clean_town(raw: str) -> Optional[str]:
    raw = raw.replace(",", " ")
    tokens = [t for t in raw.split() if t]
    obmocje_map = {
        1: ["Ajdovščina", "Idrija", "Ilirska Bistrica", "Koper", "Nova Gorica",
            "Postojna", "Sežana", "Tolmin"],
        2: ["Domžale", "Ig", "Jesenice", "Kranj", "Ljubljana", "Vrhnika"],
        3: ["Celje", "Laško", "Ločica ob Savinji", "Ravne na Koroškem",
            "Slovenske Konjice", "Slovenj Gradec", "Šentjur",
            "Šmarje pri Jelšah", "Trbovlje", "Velenje"],
        4: ["Brežice", "Črnomelj", "Kočevje", "Krško", "Novo mesto", "Sevnica"],
        5: ["Maribor", "Murska Sobota", "Ormož", "Ptuj", "Slovenska Bistrica"],
    }
    raw_lower = raw.lower()
    for obm, mesta in obmocje_map.items():
        for town in mesta:
            if town.lower() in raw_lower:
                return town
    parts: List[str] = []
    for tok in tokens:
        if re.match(r"^\d", tok):
            break
        if tok[0].islower():
            break
        if tok.lower() in {"ulica", "cesta", "naselje", "center", "trg",
                           "testirnica", "vožnja", "voznja"}:
            break
        if tok.upper() == tok:
            parts.append(tok.capitalize())
        else:
            break
    town = " ".join(parts).strip(" .,")
    return town or None

def _parse_obmocje_and_town(node) -> Tuple[Optional[int], Optional[str], bool]:
    upper = node.select_one("div.contentOpomnik div.upperOpomnikDiv")
    if not upper:
        return None, None, False
    raw = _norm_space(_text(upper))
    m_zone = re.search(r"Območje\s+(\d+)", raw, re.IGNORECASE)
    obmocje = int(m_zone.group(1)) if m_zone else None
    tolmac = bool(re.search(r"tolma[cč]", raw, re.IGNORECASE))
    after = raw.split(",", 1)[1].strip() if "," in raw else raw
    town = _clean_town(after)
    return obmocje, town, tolmac

def _normalize_categories(text: str) -> List[str]:
    cats: List[str] = []
    if "Kategorije:" in text:
        after = text.split("Kategorije:", 1)[1]
        for tok in after.replace(",", " ").split():
            t = tok.strip(" ,;/|")
            if t and len(t) <= 3:
                cats.append(t)
    return cats

def _parse_block_node(node) -> Dict:
    # Date from calendar box
    date_str: Optional[str] = None
    cal = node.select_one("div.calendarBox")
    if cal and cal.has_attr("aria-label"):
        date_str = cal["aria-label"].strip()
    if not date_str:
        sr = node.select_one("div.calendarBox .sr-only")
        if sr:
            date_str = _text(sr)
    # Time from 'Začetek ob <span class="bold">HH:MM</span>'
    time_str: Optional[str] = None
    for d in node.select("div.contentOpomnik > div"):
        txt = _text(d)
        if "Začetek ob" in txt:
            b = d.select_one("span.bold")
            if b:
                time_str = _text(b)
            else:
                m = re.search(r"\b(\d{1,2}:\d{2})\b", txt)
                if m:
                    time_str = m.group(1)
            break
    # Categories
    categories: List[str] = []
    for d in node.select("div.contentOpomnik > div"):
        if "Kategorije:" in _text(d):
            for sp in d.select("span.bold"):
                t = _text(sp).rstrip(",")
                if t:
                    categories.append(t)
            break
    places_left = _parse_places_left(node)
    exam_type = _parse_exam_type(node)
    obmocje, town, tolmac_from_line = _parse_obmocje_and_town(node)
    co = node.select_one("div.contentOpomnik")
    tolmac_anywhere = ("tolmač" in _text(co).lower()) if co else False
    tolmac = bool(tolmac_from_line or tolmac_anywhere)
    return {
        "date_str": date_str,
        "time_str": time_str,
        "obmocje": obmocje,
        "town": town,
        "exam_type": exam_type,
        "places_left": places_left,
        "tolmac": tolmac,
        "categories": ",".join(categories),
    }

# -------------------- Networking --------------------
@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=8))
def _get(session: httpx.Client, url: str, headers: dict) -> httpx.Response:
    r = session.get(url, headers=headers, timeout=30)
    r.raise_for_status()
    return r

def _extract_blocks(html: str):
    soup = _soup(html)
    return soup.select("div.dogodki div#results div.js_dogodekBox.dogodek")

# -------------------- Main fetcher --------------------
def _localize(dt: datetime) -> datetime:
    return dt if dt.tzinfo is not None else dt.replace(tzinfo=LOCAL_TZ)

def fetch_all_pages(
    type_: str = "-",
    category: str = "-",
    izpitni_center: str = "-1",
    lokacija: str = "-1",
    max_pages: int = MAX_PAGES,
) -> List[Dict]:
    default_headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/139.0.0.0 Safari/537.36"
        ),
        "Accept-Language": "sl-SI,sl;q=0.9,en-US;q=0.8,en;q=0.7",
    }

    cutoff_date = datetime.now(LOCAL_TZ) + timedelta(days=MAX_DAYS_AHEAD)

    with httpx.Client(follow_redirects=True, headers=default_headers) as s:
        # Warmup for cookies
        warm = s.get(MAIN, timeout=20)
        if DEBUG:
            print(f"[warmup] {warm.status_code} cookies={s.cookies}")

        headers = {
            "X-Requested-With": "XMLHttpRequest",
            "Referer": MAIN,
            "Accept": "text/html, */*;q=0.01",
        }
        base = dict(
            lang="si",
            type=type_,
            cat=category,
            izpitniCenter=izpitni_center,
            lokacija=lokacija,
            offset=0,
            sentinel_type="ok",
            sentinel_status="ok",
            is_ajax=1,
            complete="false",
        )

        all_items: List[Dict] = []
        seen = set()
        last_len = None

        for page in range(0, max_pages):
            params = {**base}
            if page > 0:
                params["page"] = page
            url = f"{AJAX}?{urlencode(params)}"
            resp = _get(s, url, headers)
            html = resp.text

            human_page = "first" if page == 0 else f"page {page}"
            if DEBUG and page <= 1:
                with open(os.path.join(OUTDIR, f"page_{page or 1}.html"), "w", encoding="utf-8") as f:
                    f.write(html)

            if not html or (last_len is not None and len(html) == last_len and len(html) < 100):
                break
            last_len = len(html)

            blocks = _extract_blocks(html)
            if DEBUG:
                print(f"[{human_page}] blocks detected: {len(blocks)}")
            if not blocks:
                break

            page_new = 0
            stop_due_to_cutoff = False

            for node in blocks:
                info = _parse_block_node(node)
                date = info["date_str"]
                time_str = info["time_str"]
                if not (date and time_str):
                    continue
                try:
                    dt = datetime.strptime(date.strip(), "%d. %m. %Y")
                    dt = _localize(dt)
                    if dt > cutoff_date:
                        if DEBUG:
                            print(f"[cutoff] hit {date} (> {cutoff_date.date()}), stopping.")
                        stop_due_to_cutoff = True
                        break
                except ValueError:
                    if DEBUG:
                        print(f"[warn] could not parse date: {date!r}")
                key = (
                    info["date_str"],
                    info["time_str"],
                    info.get("obmocje"),
                    (info.get("town") or "").strip().lower(),
                    info.get("categories", ""),
                )
                if key in seen:
                    continue
                seen.add(key)
                location_str = _compose_location(info.get("obmocje"), info.get("town"))
                all_items.append({
                    "date_str": info["date_str"],
                    "time_str": info["time_str"],
                    "obmocje": info["obmocje"],
                    "town": info["town"],
                    "exam_type": info["exam_type"],
                    "places_left": info["places_left"],
                    "tolmac": info["tolmac"],
                    "categories": info.get("categories", ""),
                    "location": location_str,
                    "source_page": page,
                })
                page_new += 1

            if stop_due_to_cutoff:
                break
            if page_new == 0:
                break

            time.sleep(random.uniform(*REQUEST_PAUSE))

        return all_items

# -------------------- CLI entry --------------------
if __name__ == "__main__":
    init_db()
    slots = fetch_all_pages()
    opened, updated, seen_keys, scrape_ts = upsert_slots(slots)

    print(f"Found {len(slots)} slots | opened(new): {opened} | touched: {updated}")
    for i, s in enumerate(slots[:5], 1):
        cats = s.get("categories") or "-"
        loc = s.get("location") or "-"
        print(f"{i}. {s['date_str']} {s['time_str']} | {loc} | {cats}")