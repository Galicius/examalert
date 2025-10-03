import axios from 'axios';
import * as cheerio from 'cheerio';

const MAIN_URL = 'https://e-uprava.gov.si/si/storitve/prosti-roki-za-vozniski-izpit.html';
const AJAX_URL = 'https://e-uprava.gov.si/si/storitve/prosti-roki-za-vozniski-izpit.html';
const MAX_PAGES = 50;
const MAX_DAYS_AHEAD = 90;

function normalizeSpace(text) {
  if (!text) return '';
  return text.replace(/\s+/g, ' ').trim();
}

function parseText($element) {
  if (!$element) return '';
  return normalizeSpace($element.text());
}

function parsePlacesLeft($node) {
  const greenBanner = $node.find('.zelena_pasica').first();
  if (greenBanner.length === 0) return null;
  
  const text = parseText(greenBanner);
  const match = text.match(/Še\s+(\d+)\s+prost/i);
  return match ? parseInt(match[1]) : null;
}

function parseExamType($node) {
  const content = $node.find('.contentOpomnik').first();
  if (content.length === 0) return null;
  
  const text = parseText(content).toLowerCase();
  if (text.includes('voznja')) return 'voznja';
  if (text.includes('teorija')) return 'teorija';
  return null;
}

function cleanTown(text) {
  if (!text) return null;
  text = text.trim();
  text = text.replace(/^[,\s]+/, '').replace(/[,\s]+$/, '');
  return text || null;
}

function parseObmocjeAndTown($node) {
  const content = $node.find('.contentOpomnik').first();
  if (content.length === 0) return [null, null];
  
  const text = parseText(content);
  const obmocjeMatch = text.match(/Območje\s+(\d+)/i);
  const obmocje = obmocjeMatch ? parseInt(obmocjeMatch[1]) : null;
  
  let town = null;
  if (obmocjeMatch) {
    const afterObmocje = text.substring(text.indexOf(obmocjeMatch[0]) + obmocjeMatch[0].length);
    const parts = afterObmocje.split(',');
    if (parts.length > 0) {
      town = cleanTown(parts[0]);
    }
  }
  
  return [obmocje, town];
}

function normalizeCategories(text) {
  if (!text) return '';
  return text.split(',')
    .map(c => c.trim().toUpperCase())
    .filter(c => c.length > 0)
    .join(',');
}

function parseBlockNode($, node) {
  const $node = $(node);
  
  // Parse date
  const calendarBox = $node.find('div.calendarBox').first();
  const dateStr = parseText(calendarBox);
  if (!dateStr) return null;
  
  // Parse time
  const boldSpans = $node.find('span.bold');
  let timeStr = '';
  boldSpans.each((i, el) => {
    const prev = $(el).prev();
    if (prev && parseText(prev).includes('Začetek ob')) {
      timeStr = parseText($(el));
      return false;
    }
  });
  if (!timeStr) return null;
  
  // Parse location
  const [obmocje, town] = parseObmocjeAndTown($node);
  
  // Parse exam type
  const examType = parseExamType($node);
  
  // Parse places left
  const placesLeft = parsePlacesLeft($node);
  
  // Parse tolmac
  const contentText = parseText($node.find('.contentOpomnik'));
  const tolmac = contentText.toLowerCase().includes('tolmač');
  
  // Parse categories
  const kategorija = $node.find('span:contains("Kategorija")').first();
  let categories = '';
  if (kategorija.length > 0) {
    const categoryText = parseText(kategorija.parent());
    const match = categoryText.match(/Kategorija\s*:\s*(.+)/i);
    if (match) {
      categories = normalizeCategories(match[1]);
    }
  }
  
  return {
    date_str: dateStr,
    time_str: timeStr,
    obmocje,
    town,
    exam_type: examType,
    places_left: placesLeft,
    tolmac,
    categories,
    source_page: 0
  };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function scrapeSlots() {
  const allItems = [];
  const seen = new Set();
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() + MAX_DAYS_AHEAD);
  
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'sl,en-US;q=0.9,en;q=0.8'
  };
  
  // Create axios instance
  const client = axios.create({
    headers,
    timeout: 30000,
    maxRedirects: 5
  });
  
  // Warm-up request
  try {
    await client.get(MAIN_URL);
    await sleep(1000);
  } catch (error) {
    console.error('Warm-up request failed:', error.message);
  }
  
  const ajaxParams = {
    lang: 'sl',
    tip: '',
    kategorija: '',
    izp_center: '',
    lokacija: ''
  };
  
  let stopDueToCutoff = false;
  
  for (let page = 0; page < MAX_PAGES; page++) {
    const params = { ...ajaxParams, page };
    const paramsStr = new URLSearchParams(params).toString();
    const url = `${AJAX_URL}?${paramsStr}`;
    
    console.log(`Scraping page ${page}...`);
    
    let html = '';
    try {
      const response = await client.get(url);
      html = response.data;
    } catch (error) {
      console.error(`Error fetching page ${page}:`, error.message);
      break;
    }
    
    if (!html || html.length < 100) {
      console.log('Empty page, stopping');
      break;
    }
    
    const $ = cheerio.load(html);
    const blocks = $('.js_dogodekBox.dogodek');
    
    if (blocks.length === 0) {
      console.log('No blocks found, stopping');
      break;
    }
    
    let pageNew = 0;
    
    blocks.each((i, node) => {
      const item = parseBlockNode($, node);
      if (!item || !item.date_str || !item.time_str) return;
      
      // Check cutoff date
      try {
        const [day, month, year] = item.date_str.split('.').map(s => s.trim());
        const slotDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        if (slotDate > cutoffDate) {
          stopDueToCutoff = true;
          return false;
        }
      } catch (e) {
        // Continue if date parsing fails
      }
      
      // Create unique key
      const key = `${item.date_str}|${item.time_str}|${item.obmocje}|${item.town}|${item.categories}`;
      if (seen.has(key)) return;
      
      seen.add(key);
      item.source_page = page;
      allItems.push(item);
      pageNew++;
    });
    
    console.log(`Page ${page}: found ${pageNew} new slots`);
    
    if (stopDueToCutoff || pageNew === 0) {
      break;
    }
    
    // Random pause between requests
    await sleep(1000 + Math.random() * 2000);
  }
  
  console.log(`Scraping complete. Total slots: ${allItems.length}`);
  return allItems;
}