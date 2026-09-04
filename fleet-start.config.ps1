# Per-repo fleet start config for depot-mcp
# Edit ports/backend target here - start.ps1 is fleet-standard.
@{
    Name         = 'depot-mcp'
    BackendPort  = 12013
    FrontendPort = 12012
    HealthPath   = '/api/capabilities'
    WebRoot      = 'D:\Dev\repos\depot-mcp\web_sota'
    Backend = @{
        Kind       = 'module-serve'
        Module     = 'web_sota.backend.server'
        ServeArgs  = @('--port', '12013')
        SyncExtras = @('dev')
    }
    Frontend = @{
        Kind           = 'vite-npm'
        PackageManager = 'npm'
        PortEnvVar     = 'VITE_PORT'
        ApiTargetEnv   = 'VITE_API_TARGET'
    }
}
