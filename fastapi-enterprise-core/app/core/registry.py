# app/core/registry.py

# This is the master list of all dynamically installed "apps" in your API.
# If you build a new app, you just type its name here.
APP_REGISTRY = {
    "users": ["read", "create", "update", "delete"],
    "centralized logger": ["read", "create", "update", "delete"],
    
    # 🚨 ADDED THE SYSTEM MODULE HERE
    # 'read' allows viewing the dashboard. 'update' could be used later for changing global settings.
    "system": ["read", "create", "update", "delete"],
    
    # "password_manager": ["read", "create", "update", "delete", "share"]  SAMPLE APP, NOT YET IMPLEMENTED
}
