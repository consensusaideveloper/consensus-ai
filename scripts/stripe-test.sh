#!/bin/bash

# ConsensusAI Stripe Testing Script
# Usage: ./scripts/stripe-test.sh [test-type]
# Test types: basic, errors, 3ds, international, all

set -e

# Configuration
BASE_URL="http://localhost:3001"
CLIENT_URL="http://localhost:5173"
USER_ID="test-user-$(date +%s)"  # Unique test user ID
PRICE_ID="${VITE_STRIPE_PRICE_ID:-price_test_example}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_header() {
    echo ""
    echo "=================================="
    echo "🧪 $1"
    echo "=================================="
}

# Check if jq is installed
check_dependencies() {
    if ! command -v jq &> /dev/null; then
        log_error "jq is required but not installed. Please install jq first."
        echo "macOS: brew install jq"
        echo "Ubuntu: sudo apt-get install jq"
        exit 1
    fi
    
    if ! command -v curl &> /dev/null; then
        log_error "curl is required but not installed."
        exit 1
    fi
}

# Check if servers are running
check_servers() {
    log_info "Checking if servers are running..."
    
    # Check backend server
    if ! curl -s "$BASE_URL/api/billing/health" > /dev/null 2>&1; then
        log_error "Backend server is not running at $BASE_URL"
        log_info "Please start the server: cd server && npm run dev"
        exit 1
    fi
    
    # Check frontend server
    if ! curl -s "$CLIENT_URL" > /dev/null 2>&1; then
        log_warning "Frontend server might not be running at $CLIENT_URL"
        log_info "To start frontend: cd client && npm run dev"
    fi
    
    log_success "Servers are accessible"
}

# Test 1: Health Check
test_health() {
    log_header "Health Check Test"
    
    local response=$(curl -s "$BASE_URL/api/billing/health" | jq -r '.')
    local success=$(echo "$response" | jq -r '.success // false')
    
    if [[ "$success" == "true" ]]; then
        log_success "Stripe service is healthy"
        echo "$response" | jq '.'
    else
        log_error "Stripe service health check failed"
        echo "$response"
        return 1
    fi
}

# Test 2: Create Checkout Session
test_checkout_session() {
    log_header "Checkout Session Creation Test"
    
    local payload=$(cat <<EOF
{
    "priceId": "$PRICE_ID",
    "successUrl": "$CLIENT_URL/dashboard?upgrade=success",
    "cancelUrl": "$CLIENT_URL/account?upgrade=cancelled"
}
EOF
)

    log_info "Creating checkout session for user: $USER_ID"
    log_info "Using price ID: $PRICE_ID"
    
    local response=$(curl -s -X POST "$BASE_URL/api/billing/create-checkout-session" \
        -H "Content-Type: application/json" \
        -H "x-user-id: $USER_ID" \
        -d "$payload")
    
    local session_url=$(echo "$response" | jq -r '.sessionUrl // .url // null')
    
    if [[ "$session_url" != "null" && "$session_url" != "" ]]; then
        log_success "Checkout session created successfully"
        log_info "Session URL: $session_url"
        
        # Ask user if they want to open the URL
        read -p "🌐 Open checkout URL in browser? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            if command -v open &> /dev/null; then
                open "$session_url"
            elif command -v xdg-open &> /dev/null; then
                xdg-open "$session_url"
            else
                log_info "Please manually open: $session_url"
            fi
        fi
    else
        log_error "Failed to create checkout session"
        echo "$response" | jq '.'
        return 1
    fi
}

# Test 3: Basic Integration Test
test_basic_integration() {
    log_header "Basic Integration Test"
    
    test_health || return 1
    test_checkout_session || return 1
    
    log_success "Basic integration tests passed!"
}

# Test 4: Display Test Cards Information
show_test_cards() {
    log_header "Stripe Test Cards Reference"
    
    cat << 'EOF'
💳 基本テストカード（成功パターン）:
  Visa:           4242 4242 4242 4242
  Mastercard:     5555 5555 5555 4444
  American Express: 3782 822463 10005
  JCB:            3566 0020 2036 0505

❌ エラーテストカード:
  カード拒否:      4000 0000 0000 0002
  残高不足:       4000 0000 0000 9995
  期限切れ:       4000 0000 0000 0069
  CVC エラー:     4000 0000 0000 0127

🔐 3D Secure テストカード:
  3DS認証必須:    4000 0025 0000 3155
  3DS認証失敗:    4000 0000 0000 9987

🌍 国際カードテスト:
  日本:          4000 0039 2000 0003
  英国:          4000 0082 6000 0000
  カナダ:         4000 0012 4000 0000

共通設定:
  有効期限: 12/34 (任意の未来日付)
  CVC: 123 (AMEX: 1234)
  名前: Test User
  郵便番号: 12345

詳細は docs/billing/stripe-testing-guide.md を参照してください。
EOF
}

# Test 5: Environment Check
test_environment() {
    log_header "Environment Configuration Check"
    
    log_info "Checking environment variables..."
    
    # Check server environment
    if [[ -z "$STRIPE_SECRET_KEY" ]]; then
        log_warning "STRIPE_SECRET_KEY not found in environment"
        log_info "This should be set in server/.env"
    else
        log_success "STRIPE_SECRET_KEY is configured"
    fi
    
    # Check client environment
    if [[ -z "$VITE_STRIPE_PRICE_ID" ]]; then
        log_warning "VITE_STRIPE_PRICE_ID not found in environment"
        log_info "This should be set in client/.env"
    else
        log_success "VITE_STRIPE_PRICE_ID is configured: $VITE_STRIPE_PRICE_ID"
    fi
    
    # Check if we're in test mode
    local health_response=$(curl -s "$BASE_URL/api/billing/health" 2>/dev/null | jq -r '.config // {}')
    echo "Stripe Configuration:"
    echo "$health_response" | jq '.'
}

# Interactive test selection
interactive_menu() {
    log_header "Interactive Test Menu"
    
    echo "Select a test to run:"
    echo "1) Health Check"
    echo "2) Environment Check"
    echo "3) Create Checkout Session"
    echo "4) Show Test Cards"
    echo "5) Basic Integration Test"
    echo "6) All Tests"
    echo "q) Quit"
    
    read -p "Enter your choice (1-6, q): " choice
    
    case $choice in
        1) test_health ;;
        2) test_environment ;;
        3) test_checkout_session ;;
        4) show_test_cards ;;
        5) test_basic_integration ;;
        6) run_all_tests ;;
        q|Q) log_info "Goodbye!" && exit 0 ;;
        *) log_error "Invalid choice. Please try again." && interactive_menu ;;
    esac
}

# Run all tests
run_all_tests() {
    log_header "Running All Tests"
    
    test_environment
    test_health || { log_error "Health check failed, stopping tests"; exit 1; }
    test_checkout_session
    show_test_cards
    
    log_success "All tests completed!"
}

# Manual test instructions
show_manual_test_instructions() {
    log_header "Manual Testing Instructions"
    
    cat << 'EOF'
📱 Manual Frontend Testing Steps:

1. Start both servers:
   Terminal 1: cd server && npm run dev
   Terminal 2: cd client && npm run dev

2. Open browser: http://localhost:5173

3. Login to the application

4. Navigate to Account Settings → Plan tab

5. Click "アップグレード" (Upgrade) button

6. You should be redirected to Stripe Checkout

7. Use test card: 4242 4242 4242 4242
   - Expiry: 12/34
   - CVC: 123
   - Name: Test User
   - ZIP: 12345

8. Complete payment and verify:
   - Successful payment completion
   - Redirect back to application
   - User plan status updated to "Pro"
   - Database updated (both SQLite and Firebase)

🧪 Error Testing:
   - Use 4000 0000 0000 0002 for card decline
   - Use 4000 0000 0000 9995 for insufficient funds
   - Use 4000 0025 0000 3155 for 3D Secure test

📊 Verification Points:
   - Check Stripe Dashboard for payment records
   - Verify user plan in application UI
   - Check server logs for webhook processing
   - Confirm database synchronization
EOF
}

# Main script logic
main() {
    echo "🚀 ConsensusAI Stripe Testing Tool"
    echo "=================================="
    
    check_dependencies
    check_servers
    
    case "${1:-interactive}" in
        "basic")
            test_basic_integration
            ;;
        "health")
            test_health
            ;;
        "checkout")
            test_checkout_session
            ;;
        "environment"|"env")
            test_environment
            ;;
        "cards")
            show_test_cards
            ;;
        "manual")
            show_manual_test_instructions
            ;;
        "all")
            run_all_tests
            ;;
        "interactive"|"")
            interactive_menu
            ;;
        *)
            echo "Usage: $0 [test-type]"
            echo ""
            echo "Test types:"
            echo "  basic       - Run basic integration tests"
            echo "  health      - Check service health"
            echo "  checkout    - Test checkout session creation"
            echo "  environment - Check environment configuration"
            echo "  cards       - Show test cards reference"
            echo "  manual      - Show manual testing instructions"
            echo "  all         - Run all automated tests"
            echo "  interactive - Interactive menu (default)"
            echo ""
            echo "Examples:"
            echo "  $0 basic"
            echo "  $0 checkout"
            echo "  $0"
            ;;
    esac
}

# Run main function with all arguments
main "$@"