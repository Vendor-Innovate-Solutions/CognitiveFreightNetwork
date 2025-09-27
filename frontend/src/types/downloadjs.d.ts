declare module "downloadjs" {
  type DownloadData = string | Blob | ArrayBuffer | Uint8Array;

  /**
   * Download a file
   * @param data The data to download (string, Blob, ArrayBuffer, or Uint8Array)
   * @param filename Optional filename
   * @param mimeType Optional MIME type
   */
  function download(
    data: DownloadData,
    filename?: string,
    mimeType?: string
  ): void;

  export default download;
}
