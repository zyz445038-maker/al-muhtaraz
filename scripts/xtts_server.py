"""
XTTS v2 Fast Inference Server with Arabic Tashkeel & Natural Flow
"""

import os
import json
import torch
from http.server import HTTPServer, BaseHTTPRequestHandler
import mishkal.tashkeel

# تفعيل التشكيل التلقائي
vocalizer = mishkal.tashkeel.TashkeelClass()

try:
    from TTS.api import TTS
    print("⏳ جاري تحميل نموذج Coqui XTTS v2...")
    use_gpu = torch.cuda.is_available()
    tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2", gpu=use_gpu)
    print(f"✅ تم تحميل نموذج XTTS v2 بنجاح (GPU: {use_gpu})!")
except ImportError:
    print("⚠️ تأكد من تثبيت: pip install TTS torch torchaudio mishkal")
    tts = None

class XTTSHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data.decode('utf-8'))

        raw_text = data.get('text', '').strip()
        language = data.get('language', 'ar')
        speaker_wav = data.get('speaker_wav', 'public/audio/saudi_voice_sample.wav')

        if not tts or not raw_text:
            self.send_response(400)
            self.end_headers()
            self.wfile.write(b"Server not ready or missing text")
            return

        try:
            # 1. تطبيق التشكيل التلقائي للنص العربي لضبط مخارج الحروف
            processed_text = vocalizer.tashkeel_text(raw_text)

            output_path = "temp_xtts_output.wav"
            
            # 2. التوليد مع ضبط سرعة الإلقاء والاستقرار
            tts.tts_to_file(
                text=processed_text,
                file_path=output_path,
                speaker_wav=speaker_wav,
                language=language,
                split_sentences=True, # تقسيم الجمل للوقف الطبيعي
                speed=1.05            # تسريع خفيف لمنع التردد الآلي
            )

            with open(output_path, "rb") as f:
                audio_bytes = f.read()

            self.send_response(200)
            self.send_header('Content-Type', 'audio/wav')
            self.send_header('Content-Length', str(len(audio_bytes)))
            self.end_headers()
            self.wfile.write(audio_bytes)

        except Exception as e:
            print(f"❌ Error during generation: {e}")
            self.send_response(500)
            self.end_headers()
            self.wfile.write(str(e).encode('utf-8'))

if __name__ == '__main__':
    port = 8020
    server_address = ('', port)
    httpd = HTTPServer(server_address, XTTSHandler)
    print(f"🚀 سيرفر XTTS يعمل الآن على: http://localhost:{port}")
    httpd.serve_forever()
