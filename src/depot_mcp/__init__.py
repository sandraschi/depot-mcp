"""depot-mcp — Centralized fleet file depot."""


def main():
    from depot_mcp.server import DepoMCPServer

    server = DepoMCPServer()
    server.run_stdio()


if __name__ == "__main__":
    main()
