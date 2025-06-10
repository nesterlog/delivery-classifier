import React, { useState } from "react";
import axios from "axios";
import Head from "next/head";
import Card from "../components/Card";
import FileUpload from "../components/FileUpload";
import Alert from "../components/Alert";
import ProgressBar from "../components/ProgressBar";

const DawnOptionPage: React.FC = () => {
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [requestType, setRequestType] = useState("배송대행");
  const [msgType, setMsgType] = useState("즉시전송");
  const [cycle, setCycle] = useState(0);
  const [resultLink, setResultLink] = useState<string | null>(null);
  const [alert, setAlert] = useState<{type: 'success'|'danger'|'info', message: string} | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleSubmit = async () => {
    if (!templateFile) {
      setAlert({
        type: 'danger',
        message: '새벽배송 양식 파일을 선택해주세요.'
      });
      return;
    }

    setIsProcessing(true);
    setProgress(10);
    setAlert(null);

    const formData = new FormData();
    formData.append("template_file", templateFile);
    formData.append("request_type", requestType);
    formData.append("msg_type", msgType);
    formData.append("cycle", String(cycle));

    try {
      setProgress(30);
      const res = await axios.post("/api/dawn-option/apply", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setProgress(100);
      
      if (res.data.success) {
        setResultLink(res.data.result_file);
        setAlert({
          type: 'success',
          message: '새벽 옵션이 성공적으로 추가되었습니다!'
        });
      }
    } catch (error) {
      console.error("옵션 적용 실패:", error);
      setAlert({
        type: 'danger',
        message: '옵션 적용 중 오류가 발생했습니다. 다시 시도해주세요.'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div>
      <Head>
        <title>새벽 옵션 추가</title>
      </Head>
      <h1 className="page-title">새벽 옵션 추가</h1>
      
      {alert && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}
      
      <div className="grid">
        <div className="col-8">
          <Card title="새벽 배송 옵션 설정">
            <div className="mb-4">
              <FileUpload
                label="새벽배송 양식 파일"
                onChange={setTemplateFile}
                required
                id="template-file"
              />
              <p className="text-sm text-gray mt-1">
                * 새벽배송 양식 파일에 요청유형, 문자전송유형, 차수를 자동으로 추가합니다.
              </p>
            </div>
            
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="form-group">
                <label htmlFor="request-type" className="form-label">
                  요청유형
                </label>
                <select
                  id="request-type"
                  className="form-control"
                  value={requestType}
                  onChange={(e) => setRequestType(e.target.value)}
                >
                  <option value="배송대행">배송대행</option>
                  <option value="택배대행">택배대행</option>
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="msg-type" className="form-label">
                  문자전송유형
                </label>
                <select
                  id="msg-type"
                  className="form-control"
                  value={msgType}
                  onChange={(e) => setMsgType(e.target.value)}
                >
                  <option value="즉시전송">즉시전송</option>
                  <option value="7시전송">7시전송</option>
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="cycle" className="form-label">
                  차수
                </label>
                <select
                  id="cycle"
                  className="form-control"
                  value={cycle}
                  onChange={(e) => setCycle(Number(e.target.value))}
                >
                  <option value="0">차수없음</option>
                  {[...Array(10)].map((_, i) => (
                    <option key={i} value={i + 1}>
                      {i + 1}차
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="mt-4 flex">
              <button
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={isProcessing}
              >
                {isProcessing ? "처리 중..." : "적용 및 저장"}
              </button>
              
              <button
                className="btn btn-outline ml-2"
                onClick={() => {
                  setTemplateFile(null);
                }}
                disabled={isProcessing}
              >
                초기화
              </button>
            </div>
            
            {isProcessing && (
              <div className="mt-4">
                <ProgressBar
                  progress={progress}
                  label="처리 진행 중..."
                />
              </div>
            )}
          </Card>
        </div>
        
        <div className="col-4">
          {resultLink ? (
            <Card title="처리 결과">
              <div className="text-center p-4 bg-light-gray rounded-lg mb-4">
                <div className="text-2xl font-bold text-success mb-2">
                  <span>✓</span> 완료
                </div>
                <p className="mb-4">새벽 옵션이 파일에 성공적으로 추가되었습니다.</p>
                <a
                  href={resultLink}
                  download
                  className="btn btn-primary"
                >
                  결과 파일 다운로드
                </a>
              </div>
            </Card>
          ) : (
            <Card title="도움말">
              <ul className="list-disc ml-4">
                <li className="mb-2">
                  <strong>새벽배송 양식 파일</strong>: 새벽배송 업체에 전송할 양식 파일을 업로드하세요.
                </li>
                <li className="mb-2">
                  <strong>요청유형</strong>: 양식에 추가할 요청 유형을 선택합니다.
                </li>
                <li className="mb-2">
                  <strong>문자전송유형</strong>: 문자 전송 방식을 선택합니다.
                </li>
                <li className="mb-2">
                  <strong>차수</strong>: 배송 차수를 선택합니다.
                </li>
              </ul>
              <div className="mt-4 p-3 bg-light-gray rounded-lg">
                <p className="text-sm">
                  이 기능은 새벽배송 업체에 전달할 양식 파일에 필수 정보를 자동으로 추가해주는 기능입니다.
                  파일 내의 모든 행에 동일한 요청유형, 문자전송유형, 차수 값이 적용됩니다.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default DawnOptionPage; 