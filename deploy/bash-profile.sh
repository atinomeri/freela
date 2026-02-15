# Bash Profile Aliases for Freela Deployment  
# Add these to /root/.bashrc or /root/.zshrc

# Deploy to production
deploy() {
    local msg="${1:-chore: update application}"
    cd ~/freela
    
    if [ ! -f "./deploy/quick-deploy.sh" ]; then
        echo "Error: deploy script not found"
        return 1
    fi
    
    bash ./deploy/quick-deploy.sh "$msg"
}

# Shortcut aliases
alias dd="cd ~/freela && bash ./deploy/quick-deploy.sh"
alias dl="cd ~/freela && docker-compose -f docker-compose.prod.yml logs -f"
alias dh="curl -s https://freela.ge/api/health | jq"
alias ds="docker-compose -f ~/freela/docker-compose.prod.yml ps"
alias dr="docker-compose -f ~/freela/docker-compose.prod.yml restart"

# Usage examples:
# deploy "your commit message"
# dd  (quick deploy with default message)
# dl  (view live logs)
# dh  (check health)
# ds  (view services status)
# dr  (restart all services)
