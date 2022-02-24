# This action uploads all files and directories from the source directory to the specified server
    uses: ethworks/hostlify-publish@v1
    with:
        files: <directory_path>
        id: ${{ github.COMMIT_SHA }} //suggested option
        server-url: <server_url>
