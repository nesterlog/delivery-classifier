import React, { useState, useEffect } from "react";
import axios from "axios";
import Head from "next/head";
import Card from "../components/Card";
import FileUpload from "../components/FileUpload";
import Alert from "../components/Alert";
import ProgressBar from "../components/ProgressBar";

const ClassifyPage: React.FC = () => {
  // 파일 상태
  const [orderFile, setOrderFile] = useState<File | null>(null);
  
  // 분류 옵션 상태
  const [requestType, setRequestType] = useState("배송대행");
  const [msgType, setMsgType] = useState("즉시전송");
  const [cycle, setCycle] = useState(0); // 0은 차수없음을 의미
  const [classifyMode, setClassifyMode] = useState<"all" | "day" | "dawn" | "day_and_dawn" | "all_types">("all");
  
  // 결과 상태
  const [resultFiles, setResultFiles] = useState<{type: string, path: string, count: number}[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [alert, setAlert] = useState<{type: 'success'|'danger'|'info'|'warning', message: string} | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // 주소 컬럼 상태
  const [addressColumn, setAddressColumn] = useState<string>("");
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);

  // API 기본 URL 설정
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

  // 우편번호 정보 상태
  const [zipInfo, setZipInfo] = useState<{
    day_count: number;
    dawn_count: number;
    day_filename: string | null;
    dawn_filename: string | null;
  } | null>(null);

  // 분류 방법 설명
  const classifyModeDescriptions = {
    all: "주문 주소를 분석하여 새벽배송, 당일배송, 택배배송으로 자동 분류합니다.",
    day: "당일배송 가능 지역의 주문만 추출합니다. (나머지는 미분류로 저장)",
    dawn: "새벽배송 가능 지역의 주문만 추출합니다. (나머지는 미분류로 저장)",
    day_and_dawn: "당일배송, 새벽배송 가능한 주문을 일괄 구분하여 하나의 파일로 저장합니다. (택배 불가능 지역만 포함)",
    all_types: "주문 주소를 분석하여 새벽배송, 당일배송, 택배배송을 일괄 구분하여 하나의 파일로 저장합니다."
  };

  // 저장된 우편번호 파일 정보 로드
  useEffect(() => {
    const fetchZipInfo = async () => {
      try {
        const response = await axios.get(`${API_URL}/zipcode/`);
        setZipInfo(response.data);
        
        if (response.data.day_filename && response.data.dawn_filename) {
          setAlert({
            type: 'info',
            message: `등록된 우편번호: 당일(${response.data.day_count}개), 새벽(${response.data.dawn_count}개)`
          });
        } else {
          setAlert({
            type: 'warning',
            message: '우편번호 파일이 등록되지 않았습니다. 우편번호 관리 메뉴에서 먼저 등록해주세요.'
          });
        }
      } catch (error) {
        console.error("우편번호 정보 로드 실패:", error);
      }
    };
    
    fetchZipInfo();
  }, []);

  // 주문 파일이 변경되면 헤더 컬럼 분석
  useEffect(() => {
    const analyzeColumns = async () => {
      if (!orderFile) {
        setAvailableColumns([]);
        setAddressColumn("");
        return;
      }

      const formData = new FormData();
      formData.append("file", orderFile);

      try {
        const response = await axios.post(`${API_URL}/classify/analyze-columns`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        
        if (response.data.columns) {
          setAvailableColumns(response.data.columns);
          // 주소 컬럼 자동 감지
          if (response.data.detected_address_column) {
            setAddressColumn(response.data.detected_address_column);
            setAlert({
              type: 'info',
              message: `주소 컬럼이 자동으로 감지되었습니다: ${response.data.detected_address_column}`
            });
          }
        }
      } catch (error) {
        console.error("파일 분석 실패:", error);
        setAlert({
          type: 'danger',
          message: "파일 형식이 올바르지 않습니다. 엑셀 또는 CSV 파일을 업로드해주세요."
        });
      }
    };

    if (orderFile) {
      analyzeColumns();
    }
  }, [orderFile]);

  // 분류 진행 상태 주기적 확인
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    if (isProcessing) {
      intervalId = setInterval(async () => {
        try {
          const response = await axios.get(`${API_URL}/classify/status`);
          setProgress(response.data.progress);
          
          if (response.data.status === "completed") {
            setIsProcessing(false);
            clearInterval(intervalId);
            setProgress(100);
            
            // 결과 파일 정보 저장
            if (response.data.result_files && response.data.result_files.length > 0) {
              setResultFiles(response.data.result_files);
            }
            
            // 통계 정보 저장
            if (response.data.stats) {
              setStats(response.data.stats);
            }
            
            setAlert({
              type: 'success',
              message: '분류가 성공적으로 완료되었습니다!'
            });
            
            // 결과 섹션으로 스크롤
            setTimeout(() => {
              const resultSection = document.getElementById('result-section');
              if (resultSection) {
                resultSection.scrollIntoView({ behavior: 'smooth' });
              }
            }, 500);
          } else if (response.data.status === "error") {
            clearInterval(intervalId);
            setIsProcessing(false);
            setAlert({
              type: 'danger',
              message: `분류 중 오류가 발생했습니다: ${response.data.message}`
            });
          }
        } catch (error) {
          console.error("상태 확인 실패:", error);
        }
      }, 1000);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isProcessing]);

  const handleSubmit = async () => {
    if (!orderFile) {
      setAlert({
        type: 'danger',
        message: '주문 파일을 선택해주세요.'
      });
      return;
    }

    if (!addressColumn) {
      setAlert({
        type: 'danger',
        message: '주소 컬럼을 선택해주세요.'
      });
      return;
    }

    if (!zipInfo?.day_filename && (classifyMode === 'all' || classifyMode === 'day' || classifyMode === 'day_and_dawn' || classifyMode === 'all_types')) {
      setAlert({
        type: 'danger',
        message: '당일배송 우편번호 파일이 등록되지 않았습니다. 우편번호 관리 메뉴에서 먼저 등록해주세요.'
      });
      return;
    }

    if (!zipInfo?.dawn_filename && (classifyMode === 'all' || classifyMode === 'dawn' || classifyMode === 'day_and_dawn' || classifyMode === 'all_types')) {
      setAlert({
        type: 'danger',
        message: '새벽배송 우편번호 파일이 등록되지 않았습니다. 우편번호 관리 메뉴에서 먼저 등록해주세요.'
      });
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setAlert(null);
    setResultFiles([]);
    setStats(null);

    const formData = new FormData();
    formData.append("file", orderFile);
    formData.append("address_column", addressColumn);
    formData.append("request_type", requestType);
    formData.append("msg_type", msgType);
    formData.append("cycle", String(cycle));
    formData.append("classify_mode", classifyMode);

    try {
      const res = await axios.post(`${API_URL}/classify/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      
      if (res.data.success) {
        // 백그라운드 작업이 시작되었음을 표시
        setAlert({
          type: 'info',
          message: '분류 작업이 시작되었습니다. 완료될 때까지 기다려주세요.'
        });
      }
    } catch (error) {
      console.error("분류 실패:", error);
      setAlert({
        type: 'danger',
        message: '분류 중 오류가 발생했습니다. 다시 시도해주세요.'
      });
      setIsProcessing(false);
      setProgress(0);
    }
  };

  // 배송 유형별 파일 라벨
  const getFileTypeLabel = (type: string) => {
    switch (type) {
      case 'all': return '전체 분류 결과';
      case 'day': return '당일배송 결과';
      case 'dawn': return '새벽배송 결과';
      case 'delivery': return '택배배송 결과';
      case 'unclassified': return '미분류 결과';
      case 'other': return '미분류 결과';
      case 'day_dawn': return '당일&새벽 일괄구분 결과';
      case 'all_types': return '당일&새벽&택배 일괄구분 결과';
      case 'combined': return '통합 분류 결과';
      default: return `${type} 결과`;
    }
  };

  return (
    <div className="classify-page">
      <Head>
        <title>배송 분류 자동화 - 허우적 배송분류 시스템</title>
        <meta name="description" content="엑셀 주문 데이터를 업로드하여 당일배송, 새벽배송, 택배배송으로 자동 분류합니다. 주소 분석 및 우편번호 매칭을 통한 효율적인 배송 관리 솔루션입니다." />
        <meta name="keywords" content="배송분류, 주문분류, 당일배송, 새벽배송, 택배배송, 엑셀업로드, 주소분석, 우편번호매칭" />
        <meta property="og:title" content="배송 분류 자동화 - 허우적 배송분류 시스템" />
        <meta property="og:description" content="엑셀 주문 데이터를 업로드하여 당일배송, 새벽배송, 택배배송으로 자동 분류합니다." />
        <meta property="og:url" content="https://delivery.example.com/classify" />
        <link rel="canonical" href="https://delivery.example.com/classify" />
      </Head>
      {/* 페이지 헤더 */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="flex items-center">
            <div className="icon-lg bg-primary text-white rounded-full flex items-center justify-center mr-3">
              📦
            </div>
            <div>
              <h1 className="text-2xl font-bold mb-0">배송 분류 자동화</h1>
              <p className="text-gray mb-0">주문 데이터를 배송 가능 지역별로 자동 분류합니다</p>
            </div>
          </div>
        </div>
      </div>
      
      {alert && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}
      
      <div className="grid gap-4">
        <div className="col-8">
          <Card title="📋 배송 분류 설정">
            <div className="mb-4">
              <h4 className="font-bold mb-2">분류 방법 선택</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                <button
                  type="button"
                  className={`btn ${classifyMode === "all" ? "btn-primary" : "btn-outline"}`}
                  onClick={() => setClassifyMode("all")}
                >
                  전체 분류
                </button>
                <button
                  type="button"
                  className={`btn ${classifyMode === "day" ? "btn-primary" : "btn-outline"}`}
                  onClick={() => setClassifyMode("day")}
                >
                  당일배송만
                </button>
                <button
                  type="button"
                  className={`btn ${classifyMode === "dawn" ? "btn-primary" : "btn-outline"}`}
                  onClick={() => setClassifyMode("dawn")}
                >
                  새벽배송만
                </button>
                <button
                  type="button"
                  className={`btn ${classifyMode === "day_and_dawn" ? "btn-primary" : "btn-outline"}`}
                  onClick={() => setClassifyMode("day_and_dawn")}
                >
                  일괄구분(당일&새벽)
                </button>
                <button
                  type="button"
                  className={`btn ${classifyMode === "all_types" ? "btn-primary" : "btn-outline"}`}
                  onClick={() => setClassifyMode("all_types")}
                >
                  당일&새벽&택배 구분
                </button>
              </div>
              
              <div className="mt-3 p-3 bg-light-gray rounded-lg">
                <p className="text-sm">{classifyModeDescriptions[classifyMode]}</p>
              </div>
            </div>
            
            <div className="mb-4">
              <FileUpload
                label="주문 파일"
                onChange={setOrderFile}
                required
                id="order-file"
              />
              
              {availableColumns.length > 0 && (
                <div className="form-group mt-2">
                  <label htmlFor="address-column" className="form-label">
                    주소 컬럼 <span className="text-danger">*</span>
                  </label>
                  <select
                    id="address-column"
                    className="form-control"
                    value={addressColumn}
                    onChange={(e) => setAddressColumn(e.target.value)}
                    required
                  >
                    <option value="">주소 컬럼 선택</option>
                    {availableColumns.map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="form-group mb-4">
                <label className="form-label">요청유형</label>
                <select
                  className="form-control"
                  value={requestType}
                  onChange={(e) => setRequestType(e.target.value)}
                >
                  <option value="배송대행">배송대행</option>
                  <option value="택배대행">택배대행</option>
                </select>
              </div>
              
              <div className="form-group mb-4">
                <label className="form-label">문자전송유형</label>
                <select
                  className="form-control"
                  value={msgType}
                  onChange={(e) => setMsgType(e.target.value)}
                >
                  <option value="즉시전송">즉시전송</option>
                  <option value="7시전송">7시전송</option>
                </select>
              </div>
              
              <div className="form-group mb-4">
                <label className="form-label">차수</label>
                <select
                  className="form-control"
                  value={cycle}
                  onChange={(e) => setCycle(Number(e.target.value))}
                >
                  <option value="0">차수없음</option>
                  {[...Array(10)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1}차
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="form-group">
              <p className="text-sm text-gray">
                * 빌게이츠나 스티븐잡스가 와도 찾지 못하는 경우: 건물번호와 동호수 사이에 띄어쓰기가 없는 경우입니다. 정확한 주소 형식을 확인해주세요.
              </p>
            </div>
            
            <div className="mt-4 flex">
              <button
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={isProcessing}
              >
                {isProcessing ? "분류 중..." : "분류 실행"}
              </button>
              
              <button
                className="btn btn-outline ml-2"
                onClick={() => {
                  setOrderFile(null);
                  setAddressColumn("");
                  setAvailableColumns([]);
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
                  label="분류 진행 중..."
                />
              </div>
            )}
          </Card>
        </div>
        
        <div className="col-4">
          {stats && (
            <Card title="분류 결과" id="result-section">
              <div className="mb-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-light-gray rounded-lg">
                    <div className="text-2xl font-bold text-primary">{stats.total}</div>
                    <div className="text-sm text-gray">총 건수</div>
                  </div>
                  <div className="text-center p-3 bg-light-gray rounded-lg">
                    <div className="text-2xl font-bold text-success">{stats.dawn_count || stats.dawn || 0}</div>
                    <div className="text-sm text-gray">새벽 건수</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div className="text-center p-3 bg-light-gray rounded-lg">
                    <div className="text-2xl font-bold text-secondary">{stats.day_count || stats.day || 0}</div>
                    <div className="text-sm text-gray">당일 건수</div>
                  </div>
                  <div className="text-center p-3 bg-light-gray rounded-lg">
                    <div className="text-2xl font-bold text-info">{stats.delivery_count || 0}</div>
                    <div className="text-sm text-gray">택배 건수</div>
                  </div>
                </div>
                
                {(stats.unclassified_count || stats.unclassified || 0) > 0 && (
                  <div className="grid grid-cols-1 gap-4 mt-3">
                    <div className="text-center p-3 bg-light-gray rounded-lg">
                      <div className="text-2xl font-bold text-warning">{stats.unclassified_count || stats.unclassified || 0}</div>
                      <div className="text-sm text-gray">미분류 및 주소오류 건수</div>
                    </div>
                  </div>
                )}
              </div>
              
              {resultFiles.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-bold mb-2">결과 파일 다운로드</h4>
                  <div className="space-y-2">
                    {resultFiles.filter(file => file.type !== 'all').map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-light-gray rounded-lg">
                        <span className="text-sm">
                          {getFileTypeLabel(file.type)} 
                          <span className="ml-2 text-xs text-primary">
                            ({file.count}건)
                          </span>
                        </span>
                        <a 
                          href={file.path} 
                          className="btn-sm btn-primary"
                          download
                        >
                          다운로드
                        </a>
                      </div>
                    ))}
                  </div>
                  
                  {resultFiles.filter(file => file.type !== 'all').length > 1 && (
                    <div className="mt-3">
                      <button 
                        onClick={() => {
                          // 모든 파일 다운로드 링크 자동 클릭
                          resultFiles.filter(file => file.type !== 'all').forEach(file => {
                            const link = document.createElement('a');
                            link.href = file.path;
                            link.download = file.path.split('/').pop() || '';
                            link.target = '_blank';
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          });
                        }}
                        className="btn btn-success w-full"
                      >
                        모든 파일 다운로드
                      </button>
                    </div>
                  )}
                </div>
              )}
            </Card>
          )}
          
          <Card title="도움말">
            <ul className="list-disc ml-4">
              <li className="mb-2">
                <strong>전체 분류</strong>: 주소를 분석하여 새벽배송, 당일배송, 택배배송으로 자동 분류합니다.
              </li>
              <li className="mb-2">
                <strong>당일배송만 분류</strong>: 당일배송 가능 지역의 주문만 추출합니다.
              </li>
              <li className="mb-2">
                <strong>새벽배송만 분류</strong>: 새벽배송 가능 지역의 주문만 추출합니다.
              </li>
              <li className="mb-2">
                <strong>일괄 구분</strong>: 원본데이터 기준으로 집하지점코드 105, 108 등이 자동구분생성됩니다.
              </li>
              <li className="mb-2">
                <strong>주소 컬럼</strong>: 업로드한 파일에서 배송지 주소가 있는 컬럼을 선택합니다. 시스템이 자동으로 감지를 시도합니다.
              </li>
              <li className="mb-2">
                <strong>우편번호 관리</strong>: 우편번호 파일은 <a href="/zipcode" className="text-primary">우편번호 관리</a> 메뉴에서 미리 등록해야 합니다.
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ClassifyPage; 