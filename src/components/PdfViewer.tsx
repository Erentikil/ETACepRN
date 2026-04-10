import React, { useEffect, useState } from 'react';
import { Platform, ActivityIndicator, View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';

type Props = {
  fileUri: string;
  style?: object;
};

export default function PdfViewer({ fileUri, style }: Props) {
  if (Platform.OS === 'ios') {
    return (
      <WebView
        originWhitelist={['*']}
        source={{ uri: fileUri }}
        style={[styles.flex, style]}
      />
    );
  }

  return <AndroidPdfViewer fileUri={fileUri} style={style} />;
}

function AndroidPdfViewer({ fileUri, style }: Props) {
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.Base64 })
      .then((base64) => setHtml(buildPdfHtml(base64)))
      .catch(() => setHtml(buildPdfHtml('')));
  }, [fileUri]);

  if (!html) {
    return (
      <View style={[styles.flex, styles.center, style]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <WebView
      originWhitelist={['*']}
      source={{ html }}
      style={[styles.flex, style]}
      allowFileAccess
      allowFileAccessFromFileURLs
      allowUniversalAccessFromFileURLs
      mixedContentMode="always"
    />
  );
}

function buildPdfHtml(base64: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=3.0, user-scalable=yes">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #525659; }
    #container { display: flex; flex-direction: column; align-items: center; padding: 8px; gap: 8px; }
    canvas { max-width: 100%; display: block; box-shadow: 0 2px 8px rgba(0,0,0,0.5); }
    #loading { color: #fff; padding: 24px; font-family: sans-serif; font-size: 15px; text-align: center; }
    #error { color: #ff6b6b; padding: 24px; font-family: sans-serif; font-size: 14px; text-align: center; }
  </style>
</head>
<body>
  <div id="loading">PDF yükleniyor...</div>
  <div id="error" style="display:none"></div>
  <div id="container"></div>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
  <script>
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    const base64Data = '${base64}';

    async function renderPdf() {
      const loadingEl = document.getElementById('loading');
      const errorEl = document.getElementById('error');
      const container = document.getElementById('container');

      try {
        const binary = atob(base64Data);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }

        const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
        loadingEl.style.display = 'none';

        const devicePixelRatio = window.devicePixelRatio || 1;
        const containerWidth = window.innerWidth - 16;

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const naturalViewport = page.getViewport({ scale: 1 });
          const scale = (containerWidth / naturalViewport.width) * devicePixelRatio;
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = (viewport.width / devicePixelRatio) + 'px';
          canvas.style.height = (viewport.height / devicePixelRatio) + 'px';
          container.appendChild(canvas);

          await page.render({
            canvasContext: canvas.getContext('2d'),
            viewport,
          }).promise;
        }
      } catch (e) {
        loadingEl.style.display = 'none';
        errorEl.style.display = 'block';
        errorEl.textContent = 'PDF yüklenemedi: ' + (e.message || e);
      }
    }

    renderPdf();
  </script>
</body>
</html>`;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
});
