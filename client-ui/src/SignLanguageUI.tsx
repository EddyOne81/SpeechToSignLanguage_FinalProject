import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, PlayCircle, FileText, Loader2, AlertCircle, Mic, Square } from 'lucide-react';
import PoseViewer from './PoseViewer';

export default function SignLanguageUI() {
  // Quản lý trạng thái core
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Quản lý trạng thái Ghi âm (Web Audio API)
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);

  // Quản lý trạng thái dữ liệu trả về
  const [transcript, setTranscript] = useState<string>("");
  const [fswCode, setFswCode] = useState<string>("");
  const [poseBuffer, setPoseBuffer] = useState<any>(null);

  // Memory Leak Prevention
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) window.clearInterval(timerIntervalRef.current);
    };
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setAudioFile(event.target.files[0]);
      setErrorMsg(null);
      // Nếu đang có file ghi âm cũ, ghi đè bằng file upload mới
    }
  };

  // --- LOGIC GHI ÂM CHUẨN W3C ---
  const startRecording = async () => {
    try {
      setErrorMsg(null);
      // Xin quyền truy cập Microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        // Đóng gói luồng âm thanh thành Blob định dạng WebM
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Chuyển đổi Blob thành đối tượng File để tương thích với luồng API hiện tại
        const file = new File([audioBlob], "recorded_audio.webm", { type: 'audio/webm' });
        setAudioFile(file);

        // Giải phóng tài nguyên phần cứng (Microphone)
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerIntervalRef.current = window.setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

    } catch (err: any) {
      console.error("[System] Lỗi truy cập Microphone:", err);
      setErrorMsg("Không thể truy cập Microphone. Vui lòng cấp quyền trong cài đặt trình duyệt.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) {
        window.clearInterval(timerIntervalRef.current);
      }
    }
  };

  // Định dạng thời gian hiển thị (MM:SS)
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // --- LOGIC GỌI API GATEWAY ---
  const startTranslation = async () => {
    if (!audioFile) {
      setErrorMsg("Vui lòng tải lên tệp âm thanh hoặc ghi âm trực tiếp.");
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);
    setTranscript("");
    setFswCode("");
    setPoseBuffer(null);

    try {
      const formData = new FormData();
      formData.append("file", audioFile);

      const response = await fetch("http://127.0.0.1:8000/api/v1/translate/audio", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Server connection failed.");
      }

      const result = await response.json();
      const { recognized_text_en, fsw_code, pose_coordinates, fps } = result.data;

      setTranscript(recognized_text_en);
      setFswCode(fsw_code);
      setPoseBuffer({ frames: pose_coordinates, fps: fps });
      
      console.log(`[System] Đã nhận thành công ${pose_coordinates.length} khung hình JSON.`);

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Đã xảy ra lỗi không xác định.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-6 font-sans">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">S2S - Speech 2 Sign</h1>
          <p className="text-sm text-slate-400 mt-1">Speech-to-Sign Language Conversion System</p>
        </div>
        <div className="flex items-center space-x-2 text-sm bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-full border border-emerald-500/20">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>API Gateway: Online</span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column */}
        <div className="lg:col-span-5 flex flex-col gap-6 h-[75vh]">
          
          {/* Audio Input Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col">
            <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center">
              <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-xs mr-2">Step 1</span> 
              Audio Input
            </h3>
            
            {/* Vùng tải tệp và ghi âm */}
            <div className="flex flex-col gap-4">
              
              {/* Vùng Dropzone Upload */}
              <label className={`flex flex-col items-center justify-center w-full h-28 border-2 ${audioFile && !audioFile.name.includes("recorded_audio") ? 'border-emerald-500 bg-emerald-500/5' : 'border-slate-700 border-dashed hover:bg-slate-800/50 hover:border-emerald-500/50'} rounded-xl cursor-pointer transition-all`}>
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <UploadCloud className={`w-7 h-7 mb-2 ${audioFile && !audioFile.name.includes("recorded_audio") ? 'text-emerald-400' : 'text-slate-400'}`} />
                  {audioFile && !audioFile.name.includes("recorded_audio") ? (
                    <p className="text-sm text-emerald-400 font-medium">{audioFile.name}</p>
                  ) : (
                    <>
                      <p className="text-sm text-slate-400"><span className="font-semibold text-emerald-400">Click to upload</span> or drag and drop</p>
                      <p className="text-xs text-slate-500 mt-1">.wav, .mp3, .m4a, .webm</p>
                    </>
                  )}
                </div>
                <input type="file" className="hidden" accept="audio/*" onChange={handleFileChange} />
              </label>

              <div className="flex items-center text-xs text-slate-500 uppercase font-semibold">
                <div className="flex-1 border-b border-slate-800"></div>
                <span className="mx-4">OR</span>
                <div className="flex-1 border-b border-slate-800"></div>
              </div>

              {/* Vùng Ghi âm trực tiếp */}
              <div className={`flex items-center justify-between p-4 border rounded-xl transition-all ${isRecording ? 'border-rose-500/50 bg-rose-500/5' : audioFile && audioFile.name.includes("recorded_audio") ? 'border-emerald-500 bg-emerald-500/5' : 'border-slate-800 bg-slate-950/50'}`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${isRecording ? 'bg-rose-500/20 text-rose-500 animate-pulse' : 'bg-slate-800 text-slate-400'}`}>
                    <Mic className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-slate-200">
                      {isRecording ? "Đang ghi âm..." : audioFile && audioFile.name.includes("recorded_audio") ? "Đã ghi âm xong" : "Ghi âm trực tiếp"}
                    </span>
                    <span className={`text-xs font-mono ${isRecording ? 'text-rose-400' : 'text-slate-500'}`}>
                      {formatTime(recordingTime)}
                    </span>
                  </div>
                </div>

                {isRecording ? (
                  <button onClick={stopRecording} className="bg-rose-500 hover:bg-rose-600 text-white p-2 rounded-lg transition-colors flex items-center">
                    <Square className="w-4 h-4 fill-current mr-1.5" /> Stop
                  </button>
                ) : (
                  <button onClick={startRecording} className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg transition-colors text-sm font-medium">
                    Start
                  </button>
                )}
              </div>
            </div>
            
            {errorMsg && (
              <div className="mt-4 text-xs text-rose-400 flex items-center bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20">
                <AlertCircle className="w-4 h-4 mr-2 shrink-0" />
                {errorMsg}
              </div>
            )}

            <div className="mt-auto pt-4">
              <button 
                onClick={startTranslation}
                disabled={isProcessing || !audioFile || isRecording}
                className={`w-full text-white font-medium py-3 rounded-xl flex items-center justify-center transition-all shadow-lg ${isProcessing || !audioFile || isRecording ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20'}`}
              >
                {isProcessing ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> In progress: AI translation...</>
                ) : (
                  <><PlayCircle className="w-5 h-5 mr-2" /> Start the transformation</>
                )}
              </button>
            </div>
          </div>

          {/* Transcript Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex-1 flex flex-col shadow-lg">
            <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center justify-between">
              <div className="flex items-center">
                <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-xs mr-2">Step 2</span>
                English text
              </div>
            </h3>
            <div className="bg-slate-950 rounded-xl p-4 flex-1 border border-slate-800/50 font-medium text-slate-300 leading-relaxed overflow-y-auto">
              {transcript ? (
                <div className="flex items-start mb-2">
                  <FileText className="w-4 h-4 text-emerald-500 mr-2 mt-1 shrink-0" />
                  <p>{transcript}</p>
                </div>
              ) : (
                <p className="text-slate-600 text-sm italic flex items-center h-full justify-center">Wait for a response from the server...</p>
              )}
            </div>
          </div>

        </div>

        {/* Right Column: Output / Animation Canvas */}
        <div className="lg:col-span-7 flex flex-col h-[75vh]">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl flex-1 relative overflow-hidden flex flex-col shadow-lg">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 z-10">
              <h2 className="text-sm font-semibold flex items-center text-emerald-400">
                <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded text-xs mr-2 border border-emerald-500/20">Step 3</span>
                Graphics Rendering (Skeletal Animation)
              </h2>
            </div>
            
            <div className="flex-1 flex flex-col bg-gradient-to-b from-slate-900 to-slate-950 p-6">
              
              <div className="h-28 bg-slate-950 rounded-xl border border-slate-800 p-4 overflow-y-auto relative group mb-4">
                <div className="absolute top-2 right-2 bg-slate-800 text-slate-400 text-[10px] uppercase tracking-wider px-2 py-1 rounded">FSW data</div>
                <p className="font-mono text-xs text-emerald-500/80 break-all leading-relaxed">
                  {fswCode || "Waiting for the Formal Sign Writing sequence to be generated...."}
                </p>
              </div>

              {/* Khu vực chứa Canvas Hoạt ảnh */}
              <div className="flex-1 bg-black rounded-xl border border-slate-800 flex items-center justify-center relative overflow-hidden p-2">
                {poseBuffer ? (
                   <PoseViewer buffer={poseBuffer} />
                ) : (
                  <p className="text-slate-600 text-sm">2D/3D Canvas Display Space</p>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}