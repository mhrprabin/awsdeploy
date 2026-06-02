local jwt_lib = require("resty.jwt")

-- ── Role hierarchy ────────────────────────────────────────────────────────────
local ROLE_LEVEL = { user = 1, admin = 2 }

-- ── Public routes — skip auth entirely ───────────────────────────────────────
local PUBLIC_PATHS = {
    ["/health"]                  = true,
    ["/api/users/login"]         = true,
    ["/api/users/register"]      = true,
    -- Service health endpoints (called by dashboard without a token)
    ["/api/users/health"]        = true,
    ["/api/orders/health"]       = true,
    ["/api/products/health"]     = true,
    ["/api/payments/health"]      = true,
    ["/api/notifications/health"] = true,
}

-- ── Permission rules ──────────────────────────────────────────────────────────
-- Checked in order. First match wins.
-- Add new rules here — no changes to nginx.conf needed.
local RULES = {
    -- User service
    { method = "GET",    path = "/api/users",      role = "admin" }, -- list all
    { method = "DELETE", path = "/api/users/",      role = "admin" },

    -- Product service (read = any auth user, write = admin)
    { method = "POST",   path = "/api/products",    role = "admin" },
    { method = "PUT",    path = "/api/products/",   role = "admin" },
    { method = "DELETE", path = "/api/products/",   role = "admin" },

    -- Order service
    { method = "GET",    path = "/api/orders",      role = "admin" }, -- list all orders
    { method = "DELETE", path = "/api/orders/",     role = "admin" },

    -- Payment service
    { method = "GET",    path = "/api/payments",    role = "admin" }, -- list all
    { method = "DELETE", path = "/api/payments/",   role = "admin" },
}

-- ── Helpers ───────────────────────────────────────────────────────────────────
local function reject(status, message)
    ngx.status = status
    ngx.header["Content-Type"] = "application/json"
    ngx.say('{"error":"' .. message .. '"}')
    return ngx.exit(status)
end

local function check_permission(method, path, role)
    local user_level = ROLE_LEVEL[role] or 0
    for _, rule in ipairs(RULES) do
        local method_match = (rule.method == method)
        local path_match   = (path == rule.path or path:sub(1, #rule.path) == rule.path)
        if method_match and path_match then
            local required = ROLE_LEVEL[rule.role] or 99
            if user_level < required then
                return false, rule.role
            end
        end
    end
    return true, nil
end

-- ── Main entry point (called from nginx.conf) ─────────────────────────────────
local function run()
    local path = ngx.var.uri

    -- Skip auth for public routes
    if PUBLIC_PATHS[path] then
        return
    end

    -- Read JWT secret from environment
    local secret = os.getenv("JWT_SECRET")
    if not secret or secret == "" then
        ngx.log(ngx.ERR, "JWT_SECRET env var not set")
        return reject(500, "Gateway misconfigured")
    end

    -- Validate Bearer token
    local auth_header = ngx.var.http_authorization
    if not auth_header or not auth_header:find("^Bearer ") then
        return reject(401, "Missing or invalid Authorization header")
    end

    local token    = auth_header:sub(8)
    local verified = jwt_lib:verify(secret, token)

    if not verified.verified then
        return reject(401, verified.reason or "Invalid token")
    end

    -- Forward identity headers to upstream
    local payload = verified.payload
    local role    = tostring(payload.role or "user")

    ngx.req.set_header("X-User-Id",    tostring(payload.id    or ""))
    ngx.req.set_header("X-User-Email",  tostring(payload.email or ""))
    ngx.req.set_header("X-User-Role",   role)

    -- Check route-level permissions
    local allowed, required_role = check_permission(ngx.req.get_method(), path, role)
    if not allowed then
        return reject(403, "Forbidden — requires role: " .. required_role)
    end
end

return run
