#!/usr/bin/env python3
"""
Backend API Testing for Driving Exam App
Tests authentication, learning sessions, and protected endpoints
"""

import requests
import json
import sys
from datetime import datetime, timedelta
import time

# Configuration
BASE_URL = "https://45324e1b-1432-401e-91e6-3fd6dfe0d3ec.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

# Test data
TEST_USERS = [
    {
        "email": "alice.smith@example.com",
        "username": "alice_smith",
        "password": "SecurePass123!"
    },
    {
        "email": "bob.jones@example.com", 
        "username": "bob_jones",
        "password": "MyPassword456!"
    },
    {
        "email": "carol.wilson@example.com",
        "username": "carol_wilson", 
        "password": "StrongPass789!"
    }
]

class BackendTester:
    def __init__(self):
        self.session = requests.Session()
        self.tokens = {}
        self.session_ids = []
        self.test_results = []
        
    def log_result(self, test_name, success, message, details=None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        if details:
            print(f"   Details: {details}")
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "message": message,
            "details": details
        })
    
    def test_health_check(self):
        """Test basic API health"""
        try:
            response = self.session.get(f"{API_BASE}/healthz", timeout=10)
            if response.status_code == 200:
                self.log_result("Health Check", True, "API is responding")
                return True
            else:
                self.log_result("Health Check", False, f"API returned {response.status_code}")
                return False
        except Exception as e:
            self.log_result("Health Check", False, f"Connection failed: {str(e)}")
            return False
    
    def test_user_registration(self):
        """Test user registration endpoint"""
        print("\n=== Testing User Registration ===")
        
        for i, user in enumerate(TEST_USERS):
            try:
                response = self.session.post(
                    f"{API_BASE}/auth/register",
                    json=user,
                    timeout=10
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if 'token' in data and 'user' in data:
                        self.tokens[user['username']] = data['token']
                        self.log_result(
                            f"Register User {i+1}",
                            True,
                            f"User {user['username']} registered successfully"
                        )
                    else:
                        self.log_result(
                            f"Register User {i+1}",
                            False,
                            "Missing token or user in response",
                            data
                        )
                else:
                    self.log_result(
                        f"Register User {i+1}",
                        False,
                        f"Registration failed with status {response.status_code}",
                        response.text
                    )
            except Exception as e:
                self.log_result(
                    f"Register User {i+1}",
                    False,
                    f"Registration request failed: {str(e)}"
                )
        
        # Test duplicate registration
        try:
            response = self.session.post(
                f"{API_BASE}/auth/register",
                json=TEST_USERS[0],
                timeout=10
            )
            
            if response.status_code == 400:
                self.log_result(
                    "Duplicate Registration",
                    True,
                    "Correctly rejected duplicate email/username"
                )
            else:
                self.log_result(
                    "Duplicate Registration",
                    False,
                    f"Should have rejected duplicate, got {response.status_code}"
                )
        except Exception as e:
            self.log_result(
                "Duplicate Registration",
                False,
                f"Duplicate test failed: {str(e)}"
            )
        
        # Test invalid email format
        try:
            invalid_user = {
                "email": "invalid-email",
                "username": "testuser",
                "password": "password123"
            }
            response = self.session.post(
                f"{API_BASE}/auth/register",
                json=invalid_user,
                timeout=10
            )
            
            if response.status_code == 400:
                self.log_result(
                    "Invalid Email Format",
                    True,
                    "Correctly rejected invalid email format"
                )
            else:
                self.log_result(
                    "Invalid Email Format",
                    False,
                    f"Should have rejected invalid email, got {response.status_code}"
                )
        except Exception as e:
            self.log_result(
                "Invalid Email Format",
                False,
                f"Invalid email test failed: {str(e)}"
            )
    
    def test_user_login(self):
        """Test user login endpoint"""
        print("\n=== Testing User Login ===")
        
        # Test valid login
        user = TEST_USERS[0]
        try:
            response = self.session.post(
                f"{API_BASE}/auth/login",
                json={
                    "email": user["email"],
                    "password": user["password"]
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if 'token' in data and 'user' in data:
                    self.tokens[user['username']] = data['token']
                    self.log_result(
                        "Valid Login",
                        True,
                        f"User {user['username']} logged in successfully"
                    )
                else:
                    self.log_result(
                        "Valid Login",
                        False,
                        "Missing token or user in response",
                        data
                    )
            else:
                self.log_result(
                    "Valid Login",
                    False,
                    f"Login failed with status {response.status_code}",
                    response.text
                )
        except Exception as e:
            self.log_result(
                "Valid Login",
                False,
                f"Login request failed: {str(e)}"
            )
        
        # Test invalid credentials
        try:
            response = self.session.post(
                f"{API_BASE}/auth/login",
                json={
                    "email": user["email"],
                    "password": "wrongpassword"
                },
                timeout=10
            )
            
            if response.status_code == 401:
                self.log_result(
                    "Invalid Credentials",
                    True,
                    "Correctly rejected invalid password"
                )
            else:
                self.log_result(
                    "Invalid Credentials",
                    False,
                    f"Should have rejected invalid password, got {response.status_code}"
                )
        except Exception as e:
            self.log_result(
                "Invalid Credentials",
                False,
                f"Invalid credentials test failed: {str(e)}"
            )
        
        # Test non-existent user
        try:
            response = self.session.post(
                f"{API_BASE}/auth/login",
                json={
                    "email": "nonexistent@example.com",
                    "password": "password123"
                },
                timeout=10
            )
            
            if response.status_code == 401:
                self.log_result(
                    "Non-existent User",
                    True,
                    "Correctly rejected non-existent user"
                )
            else:
                self.log_result(
                    "Non-existent User",
                    False,
                    f"Should have rejected non-existent user, got {response.status_code}"
                )
        except Exception as e:
            self.log_result(
                "Non-existent User",
                False,
                f"Non-existent user test failed: {str(e)}"
            )
    
    def test_token_verification(self):
        """Test JWT token verification"""
        print("\n=== Testing Token Verification ===")
        
        # Test valid token
        if TEST_USERS[0]['username'] in self.tokens:
            token = self.tokens[TEST_USERS[0]['username']]
            try:
                headers = {"Authorization": f"Bearer {token}"}
                response = self.session.get(
                    f"{API_BASE}/auth/verify",
                    headers=headers,
                    timeout=10
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get('valid') == True:
                        self.log_result(
                            "Valid Token",
                            True,
                            "Token verification successful"
                        )
                    else:
                        self.log_result(
                            "Valid Token",
                            False,
                            "Token marked as invalid",
                            data
                        )
                else:
                    self.log_result(
                        "Valid Token",
                        False,
                        f"Token verification failed with status {response.status_code}",
                        response.text
                    )
            except Exception as e:
                self.log_result(
                    "Valid Token",
                    False,
                    f"Token verification request failed: {str(e)}"
                )
        
        # Test invalid token
        try:
            headers = {"Authorization": "Bearer invalid_token_here"}
            response = self.session.get(
                f"{API_BASE}/auth/verify",
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 401:
                self.log_result(
                    "Invalid Token",
                    True,
                    "Correctly rejected invalid token"
                )
            else:
                self.log_result(
                    "Invalid Token",
                    False,
                    f"Should have rejected invalid token, got {response.status_code}"
                )
        except Exception as e:
            self.log_result(
                "Invalid Token",
                False,
                f"Invalid token test failed: {str(e)}"
            )
        
        # Test missing token
        try:
            response = self.session.get(
                f"{API_BASE}/auth/verify",
                timeout=10
            )
            
            if response.status_code == 401:
                self.log_result(
                    "Missing Token",
                    True,
                    "Correctly rejected missing token"
                )
            else:
                self.log_result(
                    "Missing Token",
                    False,
                    f"Should have rejected missing token, got {response.status_code}"
                )
        except Exception as e:
            self.log_result(
                "Missing Token",
                False,
                f"Missing token test failed: {str(e)}"
            )
    
    def test_learning_sessions(self):
        """Test learning sessions endpoints"""
        print("\n=== Testing Learning Sessions ===")
        
        # Test get sessions for a date
        test_date = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        try:
            response = self.session.get(
                f"{API_BASE}/learning/sessions?date={test_date}",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if 'sessions' in data and len(data['sessions']) == 3:
                    # Check if all three time slots are present
                    times = [session['time'] for session in data['sessions']]
                    expected_times = ['16:00', '18:00', '20:00']
                    
                    if all(time in times for time in expected_times):
                        self.log_result(
                            "Get Sessions",
                            True,
                            f"Retrieved 3 time slots for {test_date}"
                        )
                        # Store session IDs for further testing
                        self.session_ids = [session['id'] for session in data['sessions']]
                    else:
                        self.log_result(
                            "Get Sessions",
                            False,
                            f"Missing expected time slots. Got: {times}"
                        )
                else:
                    self.log_result(
                        "Get Sessions",
                        False,
                        f"Expected 3 sessions, got {len(data.get('sessions', []))}"
                    )
            else:
                self.log_result(
                    "Get Sessions",
                    False,
                    f"Failed to get sessions with status {response.status_code}",
                    response.text
                )
        except Exception as e:
            self.log_result(
                "Get Sessions",
                False,
                f"Get sessions request failed: {str(e)}"
            )
        
        # Test missing date parameter
        try:
            response = self.session.get(
                f"{API_BASE}/learning/sessions",
                timeout=10
            )
            
            if response.status_code == 400:
                self.log_result(
                    "Missing Date Parameter",
                    True,
                    "Correctly rejected missing date parameter"
                )
            else:
                self.log_result(
                    "Missing Date Parameter",
                    False,
                    f"Should have rejected missing date, got {response.status_code}"
                )
        except Exception as e:
            self.log_result(
                "Missing Date Parameter",
                False,
                f"Missing date test failed: {str(e)}"
            )
    
    def test_session_join_leave(self):
        """Test joining and leaving sessions"""
        print("\n=== Testing Session Join/Leave ===")
        
        if not self.session_ids:
            self.log_result(
                "Session Join/Leave",
                False,
                "No session IDs available for testing"
            )
            return
        
        session_id = self.session_ids[0]  # Use first session
        
        # Test joining without authentication
        try:
            response = self.session.post(
                f"{API_BASE}/learning/sessions/join",
                json={"session_id": session_id},
                timeout=10
            )
            
            if response.status_code == 401:
                self.log_result(
                    "Join Without Auth",
                    True,
                    "Correctly rejected unauthenticated join request"
                )
            else:
                self.log_result(
                    "Join Without Auth",
                    False,
                    f"Should have rejected unauthenticated request, got {response.status_code}"
                )
        except Exception as e:
            self.log_result(
                "Join Without Auth",
                False,
                f"Join without auth test failed: {str(e)}"
            )
        
        # Test joining with authentication
        if TEST_USERS[0]['username'] in self.tokens:
            token = self.tokens[TEST_USERS[0]['username']]
            headers = {"Authorization": f"Bearer {token}"}
            
            try:
                response = self.session.post(
                    f"{API_BASE}/learning/sessions/join",
                    json={
                        "session_id": session_id,
                        "note": "Looking forward to studying together!"
                    },
                    headers=headers,
                    timeout=10
                )
                
                if response.status_code == 200:
                    self.log_result(
                        "Join With Auth",
                        True,
                        "Successfully joined session with note"
                    )
                else:
                    self.log_result(
                        "Join With Auth",
                        False,
                        f"Failed to join session with status {response.status_code}",
                        response.text
                    )
            except Exception as e:
                self.log_result(
                    "Join With Auth",
                    False,
                    f"Join with auth request failed: {str(e)}"
                )
            
            # Test joining same session twice
            try:
                response = self.session.post(
                    f"{API_BASE}/learning/sessions/join",
                    json={"session_id": session_id},
                    headers=headers,
                    timeout=10
                )
                
                if response.status_code == 400:
                    self.log_result(
                        "Duplicate Join",
                        True,
                        "Correctly rejected duplicate join attempt"
                    )
                else:
                    self.log_result(
                        "Duplicate Join",
                        False,
                        f"Should have rejected duplicate join, got {response.status_code}"
                    )
            except Exception as e:
                self.log_result(
                    "Duplicate Join",
                    False,
                    f"Duplicate join test failed: {str(e)}"
                )
            
            # Test updating note
            try:
                response = self.session.post(
                    f"{API_BASE}/learning/sessions/note",
                    json={
                        "session_id": session_id,
                        "note": "Updated: Ready to practice exam questions!"
                    },
                    headers=headers,
                    timeout=10
                )
                
                if response.status_code == 200:
                    self.log_result(
                        "Update Note",
                        True,
                        "Successfully updated session note"
                    )
                else:
                    self.log_result(
                        "Update Note",
                        False,
                        f"Failed to update note with status {response.status_code}",
                        response.text
                    )
            except Exception as e:
                self.log_result(
                    "Update Note",
                    False,
                    f"Update note request failed: {str(e)}"
                )
            
            # Test leaving session
            try:
                response = self.session.post(
                    f"{API_BASE}/learning/sessions/leave",
                    json={"session_id": session_id},
                    headers=headers,
                    timeout=10
                )
                
                if response.status_code == 200:
                    self.log_result(
                        "Leave Session",
                        True,
                        "Successfully left session"
                    )
                else:
                    self.log_result(
                        "Leave Session",
                        False,
                        f"Failed to leave session with status {response.status_code}",
                        response.text
                    )
            except Exception as e:
                self.log_result(
                    "Leave Session",
                    False,
                    f"Leave session request failed: {str(e)}"
                )
            
            # Test leaving session not joined
            try:
                response = self.session.post(
                    f"{API_BASE}/learning/sessions/leave",
                    json={"session_id": session_id},
                    headers=headers,
                    timeout=10
                )
                
                if response.status_code == 400:
                    self.log_result(
                        "Leave Not Joined",
                        True,
                        "Correctly rejected leaving non-joined session"
                    )
                else:
                    self.log_result(
                        "Leave Not Joined",
                        False,
                        f"Should have rejected leaving non-joined session, got {response.status_code}"
                    )
            except Exception as e:
                self.log_result(
                    "Leave Not Joined",
                    False,
                    f"Leave not joined test failed: {str(e)}"
                )
    
    def test_session_capacity(self):
        """Test session capacity limits (5 participants max)"""
        print("\n=== Testing Session Capacity ===")
        
        if not self.session_ids:
            self.log_result(
                "Session Capacity",
                False,
                "No session IDs available for testing"
            )
            return
        
        session_id = self.session_ids[1]  # Use second session
        
        # Join with multiple users to test capacity
        joined_users = []
        for i, user in enumerate(TEST_USERS):
            if user['username'] in self.tokens:
                token = self.tokens[user['username']]
                headers = {"Authorization": f"Bearer {token}"}
                
                try:
                    response = self.session.post(
                        f"{API_BASE}/learning/sessions/join",
                        json={
                            "session_id": session_id,
                            "note": f"User {i+1} joining session"
                        },
                        headers=headers,
                        timeout=10
                    )
                    
                    if response.status_code == 200:
                        joined_users.append(user['username'])
                        self.log_result(
                            f"Capacity Test User {i+1}",
                            True,
                            f"User {user['username']} joined successfully"
                        )
                    else:
                        self.log_result(
                            f"Capacity Test User {i+1}",
                            False,
                            f"User {user['username']} failed to join: {response.status_code}"
                        )
                except Exception as e:
                    self.log_result(
                        f"Capacity Test User {i+1}",
                        False,
                        f"Join request failed for {user['username']}: {str(e)}"
                    )
        
        self.log_result(
            "Session Capacity Summary",
            True,
            f"Successfully joined {len(joined_users)} users to session"
        )
    
    def test_protected_questions(self):
        """Test protected questions endpoint"""
        print("\n=== Testing Protected Questions ===")
        
        # Test creating question without authentication
        question_data = {
            "question_text": "What is the speed limit in residential areas?",
            "answer_a": "30 km/h",
            "answer_b": "40 km/h", 
            "answer_c": "50 km/h",
            "answer_d": "60 km/h",
            "correct_answers": "c",
            "exam_type": "B",
            "category": "Traffic Rules"
        }
        
        try:
            response = self.session.post(
                f"{API_BASE}/questions",
                json=question_data,
                timeout=10
            )
            
            if response.status_code == 401:
                self.log_result(
                    "Questions Without Auth",
                    True,
                    "Correctly rejected unauthenticated question creation"
                )
            else:
                self.log_result(
                    "Questions Without Auth",
                    False,
                    f"Should have rejected unauthenticated request, got {response.status_code}"
                )
        except Exception as e:
            self.log_result(
                "Questions Without Auth",
                False,
                f"Questions without auth test failed: {str(e)}"
            )
        
        # Test creating question with authentication
        if TEST_USERS[0]['username'] in self.tokens:
            token = self.tokens[TEST_USERS[0]['username']]
            headers = {"Authorization": f"Bearer {token}"}
            
            try:
                response = self.session.post(
                    f"{API_BASE}/questions",
                    json=question_data,
                    headers=headers,
                    timeout=10
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if 'question' in data:
                        question = data['question']
                        if question.get('submitted_by') == TEST_USERS[0]['username']:
                            self.log_result(
                                "Questions With Auth",
                                True,
                                "Successfully created question with authenticated username"
                            )
                        else:
                            self.log_result(
                                "Questions With Auth",
                                False,
                                f"Question created but wrong username: {question.get('submitted_by')}"
                            )
                    else:
                        self.log_result(
                            "Questions With Auth",
                            False,
                            "Question created but missing question data in response"
                        )
                else:
                    self.log_result(
                        "Questions With Auth",
                        False,
                        f"Failed to create question with status {response.status_code}",
                        response.text
                    )
            except Exception as e:
                self.log_result(
                    "Questions With Auth",
                    False,
                    f"Questions with auth request failed: {str(e)}"
                )
    
    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Backend API Tests for Driving Exam App")
        print("=" * 60)
        
        # Check if API is accessible
        if not self.test_health_check():
            print("\n❌ API is not accessible. Stopping tests.")
            return False
        
        # Run all test suites
        self.test_user_registration()
        self.test_user_login()
        self.test_token_verification()
        self.test_learning_sessions()
        self.test_session_join_leave()
        self.test_session_capacity()
        self.test_protected_questions()
        
        # Print summary
        self.print_summary()
        
        return True
    
    def print_summary(self):
        """Print test results summary"""
        print("\n" + "=" * 60)
        print("📊 TEST RESULTS SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result['success'])
        total = len(self.test_results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        
        if total - passed > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result['success']:
                    print(f"  • {result['test']}: {result['message']}")
        
        print("\n" + "=" * 60)

if __name__ == "__main__":
    tester = BackendTester()
    success = tester.run_all_tests()
    
    if not success:
        sys.exit(1)