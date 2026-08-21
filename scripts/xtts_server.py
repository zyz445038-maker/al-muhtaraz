"""
XTTS v2 Fast Inference Server for Al-Muhtaraz Application
Run: python scripts/xtts_server.py
"""

import os
from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import io

try:
    from TTS.api import TTS
    print("Loading Coqui XTTS v2 model (Arabic + Voice Cloning)...")
    tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2", gpu=False)
    print("XTTS v2 model loaded successfully!")
except ImportError:
    print("Note: To run local XTTS v2, install: pip install TTS torch torchaudio")
    tts = None

class XTTSHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data.decode('utf-8'))

        text = data.get('text', '')
        language = data.get('language', 'ar')
        speaker_wav = data.get('speaker_wav', 'saudi_female_sample.wav')

        if not tts:
            self.send_response(500)
            self.end_headers()
            self.wfile.write(b"XTTS library not installed")
            return

        try:
            out_file = io.BytesIO()
            # Synthesize with voice cloning
            tts.tts_to_file(
                text=text,
                file_path="temp_xtts_output.wav",
                speaker_wav=speaker_wav,
                language=language
            )
            with open("temp_xtts_output.wav", "rb") as f:
                audio_bytes = f.read()

            self.send_response(200)
            self.send_header('Content-Type', 'audio/wav')
            self.send_header('Content-Length', str(len(audio_bytes)))
            self.end_headers()
            self.wfile.write(audio_bytes)
        except Exception as e:
            self.send_response(500)
            self.end_headers()
            self.wfile.write(str(e).encode('utf-8'))

if __name__ == '__main__':
    port = 8020
    server_address = ('', port)
    httpd = HTTPServer(server_address, XTTSHandler)
    print(f"XTTS v2 Server running on http://localhost:{port}")
    httpd.serve_forever()
