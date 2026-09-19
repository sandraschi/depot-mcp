# Per-repo fleet start config for depot-mcp
# Edit ports/backend target here - start.ps1 is fleet-standard.
@{
    Name         = 'depot-mcp'
    BackendPort  = 10727
    FrontendPort = 10726
    HealthPath   = '/api/capabilities'
    WebRoot      = 'web_sota\frontend'
    Backend = @{
        Kind       = 'module-serve'
        Module     = 'web_sota.backend.server'
        ServeArgs  = '--port {BackendPort}'
        SyncExtras = @('dev')
    }
    Frontend = @{
        Kind           = 'vite-npm'
        PackageManager = 'bun'
        PortEnvVar     = 'VITE_PORT'
        ApiTargetEnv   = 'VITE_API_TARGET'
    }
}
