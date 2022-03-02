# This action uploads all files and directories from the source directory to the specified server

```yaml
- uses: ethworks/hostlify-publish@v3.16
  with:
    files: <path_to_root>
    server-url: <server_url_with_nginx>
    owner: EthWorks
    repo: hostlify
    access-token: ${{ secrets.GITHUB_TOKEN }}
    pullNumber: ${{ github.event.number }}
```
