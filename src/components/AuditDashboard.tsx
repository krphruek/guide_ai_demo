
import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Textarea } from '@/components/ui/textarea';
import { 
  Camera, 
  Upload, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  ChevronRight, 
  Layout, 
  FileText, 
  Image as ImageIcon,
  RefreshCw,
  ArrowRight,
  Info,
  ChevronDown,
  Plus,
  X,
  History,
  Check,
  Sparkles,
  Video
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { analyzeStoreLayout } from '@/lib/gemini';
import { AuditResult, AuditCheck, Guideline } from '@/types/audit';
import confetti from 'canvas-confetti';
import { cn } from '@/lib/utils';

interface StoreFile {
  data: string;
  type: string;
  name: string;
}

export default function AuditDashboard() {
  const [storeFiles, setStoreFiles] = useState<StoreFile[]>([]);
  const [guidelines, setGuidelines] = useState<Guideline[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<{file: StoreFile, result: AuditResult}[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<StoreFile | null>(null);

  const storeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('store_guidelines');
    if (saved) {
      const parsed = JSON.parse(saved);
      setGuidelines(parsed);
    }
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setStoreFiles(prev => [...prev, {
          data: reader.result as string,
          type: file.type,
          name: file.name
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeStoreFile = (index: number) => {
    setStoreFiles(prev => prev.filter((_, i) => i !== index));
    if (currentFileIndex >= storeFiles.length - 1) {
      setCurrentFileIndex(Math.max(0, storeFiles.length - 2));
    }
  };

  const startAnalysis = async () => {
    if (storeFiles.length === 0) {
      setError("กรุณาอัปโหลดรูปภาพหรือวิดีโอร้านค้าอย่างน้อย 1 ไฟล์");
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setResults([]);

    try {
      const newResults: {file: StoreFile, result: AuditResult}[] = [];
      
      // Process files sequentially
      for (const file of storeFiles) {
        const auditResult = await analyzeStoreLayout(
          file.data,
          file.type,
          guidelines
        );
        newResults.push({ file: file, result: auditResult });
        
        if (auditResult.overallScore >= 80) {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.7 }
          });
        }
      }
      
      setResults(newResults);
      setCurrentFileIndex(0);
    } catch (err) {
      console.error(err);
      setError("เกิดข้อผิดพลาดในการวิเคราะห์ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getStatusIcon = (status: AuditCheck['status']) => {
    switch (status) {
      case 'pass': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'fail': return <XCircle className="w-5 h-5 text-rose-500" />;
      case 'warning': return <AlertCircle className="w-5 h-5 text-amber-500" />;
    }
  };

  const getStatusBadge = (status: AuditCheck['status']) => {
    switch (status) {
      case 'pass': return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200">ผ่าน</Badge>;
      case 'fail': return <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 border-rose-200">ไม่ผ่าน</Badge>;
      case 'warning': return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200">ควรปรับปรุง</Badge>;
    }
  };

  const currentResult = results[currentFileIndex];

  return (
    <div className="min-h-screen bg-[#F8F9FA] p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">ตรวจสอบร้านค้า</h1>
            <p className="text-slate-500 mt-1">ตรวจสอบความถูกต้องของการจัดวางสินค้าจากรูปภาพและวิดีโอ</p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              onClick={() => {
                setStoreFiles([]);
                setResults([]);
                setCurrentFileIndex(0);
              }}
              className="border-slate-200"
            >
              ล้างข้อมูล
            </Button>
            <Button 
              onClick={startAnalysis} 
              disabled={isAnalyzing || storeFiles.length === 0}
              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-100 transition-all active:scale-95"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  กำลังวิเคราะห์ ({results.length}/{storeFiles.length})
                </>
              ) : (
                <>
                  <Layout className="w-4 h-4 mr-2" />
                  เริ่มการตรวจสอบ
                </>
              )}
            </Button>
          </div>
        </header>

        {error && (
          <Alert variant="destructive" className="bg-rose-50 border-rose-200 text-rose-800">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>ข้อผิดพลาด</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Inputs */}
          <div className="lg:col-span-5 space-y-6">
            {/* Info Card */}
            <Card className="border-slate-200 shadow-sm overflow-hidden bg-indigo-50/30">
              <CardContent className="p-4 flex gap-3">
                <div className="bg-indigo-100 p-2 rounded-lg shrink-0 h-fit">
                  <Info className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-900">AI วิเคราะห์อัตโนมัติ</p>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    ระบบจะเลือกเกณฑ์ที่เหมาะสมที่สุดจากรายการที่คุณบันทึกไว้ในหน้า Guidelines มาใช้ในการตรวจสอบโดยอัตโนมัติ
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Store Files Upload */}
            <Card className="border-slate-200 shadow-sm overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Camera className="w-4 h-4 text-indigo-600" />
                    ไฟล์ที่ต้องการตรวจสอบ ({storeFiles.length})
                  </CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                    onClick={() => storeInputRef.current?.click()}
                  >
                    <Plus className="w-4 h-4 mr-1" /> เพิ่มไฟล์
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                {storeFiles.length === 0 ? (
                  <div 
                    onClick={() => storeInputRef.current?.click()}
                    className="aspect-video rounded-xl border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-slate-50 transition-all cursor-pointer flex flex-col items-center justify-center gap-3 text-slate-400"
                  >
                    <div className="p-3 rounded-full bg-slate-50">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-slate-700">คลิกเพื่ออัปโหลดรูปภาพหรือวิดีโอ</p>
                      <p className="text-xs">สามารถเลือกได้หลายไฟล์พร้อมกัน</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {storeFiles.map((file, idx) => (
                      <div 
                        key={idx} 
                        className={cn(
                          "relative aspect-video rounded-lg overflow-hidden border-2 transition-all cursor-pointer group",
                          currentFileIndex === idx ? "border-indigo-600 ring-2 ring-indigo-100" : "border-slate-100"
                        )}
                        onClick={() => setCurrentFileIndex(idx)}
                      >
                        {file.type.startsWith('image/') ? (
                          <img src={file.data} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-slate-100 flex flex-col items-center justify-center gap-2">
                            <Video className="w-8 h-8 text-slate-400" />
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Video</span>
                          </div>
                        )}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            removeStoreFile(idx);
                          }}
                          className="absolute top-1 right-1 bg-rose-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        {results[idx] && (
                          <div className="absolute bottom-1 right-1">
                            <Badge className={cn(
                              "text-[10px] h-5 px-1.5",
                              results[idx].result.overallScore >= 80 ? "bg-emerald-500" : 
                              results[idx].result.overallScore >= 50 ? "bg-amber-500" : "bg-rose-500"
                            )}>
                              {results[idx].result.overallScore}%
                            </Badge>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <input 
                  type="file" 
                  ref={storeInputRef} 
                  multiple 
                  onChange={handleFileUpload} 
                  className="hidden" 
                  accept="image/*,video/*"
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Results */}
          <div className="lg:col-span-7">
            <AnimatePresence mode="wait">
              {isAnalyzing && results.length < storeFiles.length ? (
                <motion.div 
                  key="loading"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="space-y-6"
                >
                  <Card className="border-slate-200 shadow-sm">
                    <CardContent className="p-12 flex flex-col items-center justify-center text-center space-y-6">
                      <div className="relative">
                        <div className="w-20 h-20 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Layout className="w-8 h-8 text-indigo-600 animate-pulse" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-xl font-semibold text-slate-900">กำลังวิเคราะห์ไฟล์ที่ {results.length + 1} จาก {storeFiles.length}</h3>
                        <p className="text-slate-500 max-w-xs mx-auto">
                          AI กำลังประมวลผลความถูกต้องจากรูปภาพหรือวิดีโอที่คุณอัปโหลด...
                        </p>
                      </div>
                      <div className="w-full max-w-md space-y-3">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4 mx-auto" />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ) : currentResult ? (
                <motion.div 
                  key={`result-${currentFileIndex}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-6"
                >
                  {/* AI Result Alert Banner */}
                  {currentResult.result.overallScore < 100 ? (
                    <Alert className={cn(
                      "border-2",
                      currentResult.result.overallScore >= 80 ? "bg-emerald-50 border-emerald-200 text-emerald-800" : 
                      currentResult.result.overallScore >= 50 ? "bg-amber-50 border-amber-200 text-amber-800" : 
                      "bg-rose-50 border-rose-200 text-rose-800"
                    )}>
                      {currentResult.result.overallScore >= 80 ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      ) : currentResult.result.overallScore >= 50 ? (
                        <AlertCircle className="h-5 w-5 text-amber-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-rose-600" />
                      )}
                      <AlertTitle className="font-bold text-lg">
                        {currentResult.result.overallScore >= 80 ? "การจัดวางถูกต้องเกือบทั้งหมด" : 
                         currentResult.result.overallScore >= 50 ? "พบจุดที่ต้องแก้ไขบางส่วน" : 
                         "พบข้อผิดพลาดรุนแรงในการจัดวาง"}
                      </AlertTitle>
                      <AlertDescription className="mt-1 font-medium">
                        {currentResult.result.summary}
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert className="bg-emerald-50 border-emerald-200 text-emerald-800 border-2">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      <AlertTitle className="font-bold text-lg">การจัดวางถูกต้องสมบูรณ์ 100%</AlertTitle>
                      <AlertDescription className="mt-1 font-medium">
                        ยินดีด้วย! การจัดวางสินค้าเป็นไปตาม Guideline ทุกประการ
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Result Header */}
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div 
                        className="relative w-40 h-24 rounded-2xl overflow-hidden border-4 border-white shadow-lg cursor-pointer group/thumb hover:ring-2 hover:ring-indigo-400 transition-all shrink-0"
                        onClick={() => {
                          setPreviewFile(currentResult.file);
                          setIsPreviewOpen(true);
                        }}
                      >
                        {currentResult.file.type.startsWith('image/') ? (
                          <img src={currentResult.file.data} alt="Thumbnail" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-slate-100 flex flex-col items-center justify-center gap-2">
                            <Video className="w-8 h-8 text-slate-400" />
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Video</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-indigo-900/20 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-all duration-300 backdrop-blur-[1px]">
                          <div className="bg-white/90 p-2 rounded-lg shadow-xl transform translate-y-2 group-hover/thumb:translate-y-0 transition-transform">
                            <Plus className="w-5 h-5 text-indigo-600" />
                          </div>
                        </div>
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-lg">ผลการตรวจสอบไฟล์ที่ {currentFileIndex + 1}</h3>
                        <p className="text-sm text-slate-500">ตรวจสอบเมื่อ {new Date(currentResult.result.timestamp).toLocaleTimeString('th-TH')}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {storeFiles.map((_, idx) => (
                        <button 
                          key={idx}
                          onClick={() => setCurrentFileIndex(idx)}
                          className={cn(
                            "w-2 h-2 rounded-full transition-all",
                            currentFileIndex === idx ? "w-6 bg-indigo-600" : "bg-slate-300 hover:bg-slate-400"
                          )}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Score Card */}
                  <Card className="border-slate-200 shadow-md overflow-hidden">
                    <div className={cn(
                      "p-6 text-white flex items-center justify-between transition-colors",
                      currentResult.result.overallScore >= 80 ? "bg-emerald-600" : 
                      currentResult.result.overallScore >= 50 ? "bg-amber-500" : "bg-rose-600"
                    )}>
                      <div className="space-y-1">
                        <p className="text-white/80 text-sm font-medium uppercase tracking-wider">คะแนนความถูกต้อง</p>
                        <h2 className="text-5xl font-bold">{currentResult.result.overallScore}%</h2>
                      </div>
                      <div className="hidden sm:block">
                        <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20">
                          <p className="text-xs font-semibold mb-1">สถานะ</p>
                          <div className="flex items-center gap-2">
                            {currentResult.result.overallScore >= 80 ? (
                              <Badge className="bg-white text-emerald-700 font-bold border-none">ยอดเยี่ยม</Badge>
                            ) : currentResult.result.overallScore >= 50 ? (
                              <Badge className="bg-white text-amber-700 font-bold border-none">ต้องแก้ไข</Badge>
                            ) : (
                              <Badge className="bg-white text-rose-700 font-bold border-none">ไม่ผ่านเกณฑ์</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <CardContent className="p-6 bg-white">
                      <div className="flex items-start gap-4">
                        <div className="p-2 rounded-lg bg-slate-50 text-slate-400 mt-1">
                          <Info className="w-5 h-5" />
                        </div>
                        <p className="text-slate-600 leading-relaxed italic">
                          "{currentResult.result.summary}"
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Detailed Checks */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                      รายละเอียดการตรวจสอบ
                    </h3>
                    <ScrollArea className="h-[450px] pr-4">
                      <div className="space-y-4">
                        {currentResult.result.checks.map((check, index) => (
                          <motion.div
                            key={check.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                          >
                            <Card className={cn(
                              "border-l-4 transition-all hover:shadow-md",
                              check.status === 'pass' ? 'border-l-emerald-500' : 
                              check.status === 'fail' ? 'border-l-rose-500' : 'border-l-amber-500'
                            )}>
                              <CardContent className="p-5">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      {getStatusIcon(check.status)}
                                      <h4 className="font-bold text-slate-900">{check.title}</h4>
                                      {getStatusBadge(check.status)}
                                    </div>
                                    <p className="text-slate-600 text-sm mt-2">{check.message}</p>
                                    {check.suggestion && (
                                      <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-start gap-2">
                                        <ArrowRight className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                                        <p className="text-sm text-indigo-700 font-medium">
                                          <span className="font-bold">คำแนะนำ:</span> {check.suggestion}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                  <Badge variant="outline" className="capitalize text-[10px] tracking-widest opacity-60">
                                    {check.category}
                                  </Badge>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </motion.div>
              ) : (
                <Card className="border-slate-200 border-dashed bg-slate-50/50 h-full min-h-[600px] flex flex-col items-center justify-center text-center p-8">
                  <div className="p-6 rounded-full bg-white shadow-sm border border-slate-100 mb-6">
                    <Layout className="w-12 h-12 text-slate-300" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-400">พร้อมสำหรับการตรวจสอบ</h3>
                  <p className="text-slate-400 max-w-xs mt-2">
                    เลือก Guideline และอัปโหลดรูปภาพร้านค้า จากนั้นกดปุ่ม "เริ่มการตรวจสอบ"
                  </p>
                </Card>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* File Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="w-[95vw] max-w-7xl p-0 overflow-hidden rounded-[32px] border-none bg-black/95">
          <div className="relative w-full h-full flex items-center justify-center min-h-[50vh] max-h-[90vh]">
            <button 
              onClick={() => setIsPreviewOpen(false)}
              className="absolute top-4 right-4 z-50 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white p-2 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            {previewFile && (
              previewFile.type.startsWith('image/') ? (
                <img 
                  src={previewFile.data} 
                  alt="Full Preview" 
                  className="max-w-full max-h-[90vh] object-contain"
                />
              ) : (
                <video 
                  src={previewFile.data} 
                  controls 
                  autoPlay
                  className="max-w-full max-h-[90vh] object-contain"
                />
              )
            )}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-md px-6 py-2 rounded-full border border-white/10">
              <p className="text-white text-sm font-medium tracking-wide">ไฟล์ที่ {currentFileIndex + 1} - มุมมองขยาย</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
