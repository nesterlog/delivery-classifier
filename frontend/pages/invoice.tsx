import React, { useState } from "react";
import axios from "axios";
import Head from "next/head";
import Card from "../components/Card";
import FileUpload from "../components/FileUpload";
import Alert from "../components/Alert";
import ProgressBar from "../components/ProgressBar";
import LoadingSpinner from "../components/LoadingSpinner";

const InvoicePage: React.FC = () => {
  // 일반 송장매칭 상태
  const [classifiedFile, setClassifiedFile] = useState<File | null>(null);
  const [invoiceDayFile, setInvoiceDayFile] = useState<File | null>(null);
  const [invoiceDawnFile, setInvoiceDawnFile] = useState<File | null>(null);
  const [matchedLink, setMatchedLink] = useState<string | null>(null);
  const [unmatchedLink, setUnmatchedLink] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [alert, setAlert] = useState<{type: 'success'|'danger'|'info'|'warning', message: string} | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  // 새벽배송 전용 송장매칭 상태
  const [dawnOrderFile, setDawnOrderFile] = useState<File | null>(null);
  const [dawnInvoiceFile, setDawnInvoiceFile] = useState<File | null>(null);
  const [dawnMatchedLink, setDawnMatchedLink] = useState<string | null>(null);
  const [dawnUnmatchedLink, setDawnUnmatchedLink] = useState<string | null>(null);
  const [dawnStats, setDawnStats] = useState<any>(null);
  const [isDawnProcessing, setIsDawnProcessing] = useState(false);
  const [dawnProgress, setDawnProgress] = useState(0);

  const handleSubmit = async () => {
    if (!classifiedFile) {
      setAlert({
        type: 'warning',
        message: '분류 완료 주문 파일을 선택해주세요.'
      });
      return;
    }
    
    if (!invoiceDayFile) {
      setAlert({
        type: 'warning',
        message: '당일 배송 송장 파일을 선택해주세요.'
      });
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setAlert(null);
    setMatchedLink(null);
    setUnmatchedLink(null);
    setStats(null);
    
    const formData = new FormData();
    formData.append("classified_file", classifiedFile);
    formData.append("invoice_day_file", invoiceDayFile);
    
    if (invoiceDawnFile) {
      formData.append("invoice_dawn_file", invoiceDawnFile);
    }

    try {
      // 진행 상황을 시뮬레이션
      let progressInterval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev + 5;
          return newProgress >= 90 ? 90 : newProgress;
        });
      }, 300);
      
      const res = await axios.post("/api/invoice-match/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      
      clearInterval(progressInterval);
      setProgress(100);
      
      if (res.data.success) {
        setMatchedLink(res.data.matched_file);
        setUnmatchedLink(res.data.unmatched_file);
        setStats(res.data.stats);
        setAlert({
          type: 'success',
          message: '송장 매칭이 성공적으로 완료되었습니다!'
        });
      }
    } catch (error) {
      console.error("송장 매칭 실패:", error);
      setAlert({
        type: 'danger',
        message: '송장 매칭 중 오류가 발생했습니다. 파일 형식을 확인해주세요.'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDawnSubmit = async () => {
    if (!dawnOrderFile) {
      setAlert({
        type: 'warning',
        message: '새벽배송양식 파일을 선택해주세요.'
      });
      return;
    }
    
    if (!dawnInvoiceFile) {
      setAlert({
        type: 'warning',
        message: '새벽송장번호양식 파일을 선택해주세요.'
      });
      return;
    }

    setIsDawnProcessing(true);
    setDawnProgress(0);
    setAlert(null);
    setDawnMatchedLink(null);
    setDawnUnmatchedLink(null);
    setDawnStats(null);
    
    const formData = new FormData();
    formData.append("dawn_order_file", dawnOrderFile);
    formData.append("dawn_invoice_file", dawnInvoiceFile);

    try {
      // 진행 상황을 시뮬레이션
      let progressInterval = setInterval(() => {
        setDawnProgress(prev => {
          const newProgress = prev + 5;
          return newProgress >= 90 ? 90 : newProgress;
        });
      }, 200);
      
      const res = await axios.post("/api/invoice-match/dawn-invoice-match/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      
      clearInterval(progressInterval);
      setDawnProgress(100);
      
      if (res.data.success) {
        setDawnMatchedLink(res.data.matched_file);
        setDawnUnmatchedLink(res.data.unmatched_file);
        setDawnStats(res.data.stats);
        setAlert({
          type: 'success',
          message: '새벽배송 송장매칭이 성공적으로 완료되었습니다!'
        });
      }
    } catch (error) {
      console.error("새벽배송 송장매칭 실패:", error);
      setAlert({
        type: 'danger',
        message: '새벽배송 송장매칭 중 오류가 발생했습니다. 파일 형식과 필수 컬럼을 확인해주세요.'
      });
    } finally {
      setIsDawnProcessing(false);
    }
  };

  const resetForm = () => {
    setClassifiedFile(null);
    setInvoiceDayFile(null);
    setInvoiceDawnFile(null);
    setMatchedLink(null);
    setUnmatchedLink(null);
    setStats(null);
    setAlert(null);
  };

  const resetDawnForm = () => {
    setDawnOrderFile(null);
    setDawnInvoiceFile(null);
    setDawnMatchedLink(null);
    setDawnUnmatchedLink(null);
    setDawnStats(null);
    setAlert(null);
  };

  return (
    <div>
              <Head>
          <title>송장 매칭 - 허우적 배송분류 시스템</title>
          <meta name="description" content="분류된 주문 파일과 송장 파일을 매칭하여 주문별 송장번호를 자동으로 매핑합니다. 일반 송장매칭과 새벽배송 전용 송장매칭을 지원합니다." />
          <meta name="keywords" content="송장매칭, 송장번호, 주문매칭, 새벽배송송장, 배송관리, 자동매핑" />
          <meta property="og:title" content="송장 매칭 - 허우적 배송분류 시스템" />
          <meta property="og:description" content="분류된 주문 파일과 송장 파일을 매칭하여 주문별 송장번호를 자동으로 매핑합니다." />
          <meta property="og:url" content="https://delivery.example.com/invoice" />
          <link rel="canonical" href="https://delivery.example.com/invoice" />
        </Head>
      <h1 className="page-title">송장 매칭</h1>
      
      {alert && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}
      
      {/* 일반 송장매칭 섹션 */}
      <div className="mb-8">
        <div className="grid">
          <div className="col-8">
            <Card title="일반 송장 매칭">
              <div className="mb-4">
                <p className="text-sm mb-3">
                  분류 완료된 주문 파일과 송장 파일을 매칭하여 주문별 송장번호를 자동으로 매핑합니다.
                  주소 및 연락처 정보를 기반으로 가장 유사한 항목을 찾아 매칭합니다.
                </p>
                
                <div className="mb-4">
                  <FileUpload
                    label="분류 완료 주문 파일"
                    onChange={setClassifiedFile}
                    id="classified-file"
                    required
                  />
                  <p className="text-xs text-gray mt-1">
                    * 배송 분류 기능으로 생성된 결과 파일을 사용하세요.
                  </p>
                </div>
                
                <div className="mb-4">
                  <FileUpload
                    label="당일 배송 송장 파일"
                    onChange={setInvoiceDayFile}
                    id="invoice-day-file"
                    required
                  />
                  <p className="text-xs text-gray mt-1">
                    * 택배사에서 받은 당일 배송 송장 데이터 파일을 사용하세요.
                  </p>
                </div>
                
                <div className="mb-4">
                  <FileUpload
                    label="새벽 배송 송장 파일 (선택)"
                    onChange={setInvoiceDawnFile}
                    id="invoice-dawn-file"
                  />
                  <p className="text-xs text-gray mt-1">
                    * 새벽 배송 송장 파일이 있는 경우에만 선택하세요.
                  </p>
                </div>
              </div>
              
              <div className="flex">
                <button
                  className="btn btn-primary"
                  onClick={handleSubmit}
                  disabled={isProcessing}
                >
                  {isProcessing ? "매칭 중..." : "매칭 실행"}
                </button>
                
                <button
                  className="btn btn-outline ml-2"
                  onClick={resetForm}
                  disabled={isProcessing}
                >
                  초기화
                </button>
              </div>
              
              {isProcessing && (
                <div className="mt-4">
                  <ProgressBar
                    progress={progress}
                    label="매칭 진행 중..."
                  />
                </div>
              )}
            </Card>
          </div>
          
          <div className="col-4">
            {stats ? (
              <Card title="매칭 결과">
                <div className="mb-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="text-center p-3 bg-light-gray rounded-lg">
                      <div className="text-2xl font-bold text-primary">{stats.total_orders}</div>
                      <div className="text-sm text-gray">총 주문 수</div>
                    </div>
                    
                    <div className="text-center p-3 bg-light-gray rounded-lg">
                      <div className="text-2xl font-bold text-success">{stats.matched}</div>
                      <div className="text-sm text-gray">매칭 성공</div>
                    </div>
                    
                    <div className="text-center p-3 bg-light-gray rounded-lg">
                      <div className="text-2xl font-bold text-danger">{stats.unmatched}</div>
                      <div className="text-sm text-gray">미매칭</div>
                    </div>
                    
                    <div className="text-center p-3 bg-light-gray rounded-lg">
                      <div className="text-2xl font-bold text-info">{stats.match_rate}%</div>
                      <div className="text-sm text-gray">매칭률</div>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2">
                  {matchedLink && (
                    <a
                      href={matchedLink}
                      download
                      className="btn btn-primary text-center"
                    >
                      매칭 완료 파일 다운로드
                    </a>
                  )}
                  
                  {unmatchedLink && (
                    <a
                      href={unmatchedLink}
                      download
                      className="btn btn-outline text-center"
                    >
                      미매칭 파일 다운로드
                    </a>
                  )}
                </div>
              </Card>
            ) : (
              <Card title="도움말">
                <ul className="list-disc ml-4">
                  <li className="mb-2">
                    <strong>분류 완료 주문 파일</strong>: 배송 분류 후 생성된 결과 파일을 사용하세요.
                  </li>
                  <li className="mb-2">
                    <strong>당일 배송 송장</strong>: 택배사에서 제공받은 송장 데이터를 사용하세요.
                  </li>
                  <li className="mb-2">
                    <strong>매칭 방식</strong>: 받는분 이름과 주소 정보를 비교하여 자동 매칭합니다.
                  </li>
                  <li className="mb-2">
                    <strong>결과</strong>: 매칭된 데이터와 미매칭 데이터가 별도 파일로 생성됩니다.
                  </li>
                </ul>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* 구분선 */}
      <div className="border-t border-gray-200 my-8"></div>

      {/* 새벽배송 전용 송장매칭 섹션 */}
      <div>
        <div className="grid">
          <div className="col-8">
            <Card title="새벽배송 전용 송장매칭">
              <div className="mb-4">
                <p className="text-sm mb-3 text-blue-600">
                  새벽배송양식과 새벽송장번호양식을 매칭합니다. 
                  상품주문번호 우선 매칭 후 이름+주소 유사도 매칭(80% 이상)을 진행합니다.
                </p>
                
                <div className="mb-4">
                  <FileUpload
                    label="새벽배송양식 파일"
                    onChange={setDawnOrderFile}
                    id="dawn-order-file"
                    required
                  />
                  <p className="text-xs text-gray mt-1">
                    * 새벽옵션추가 탭에서 생성된 새벽배송양식 파일을 사용하세요.
                  </p>
                </div>
                
                <div className="mb-4">
                  <FileUpload
                    label="새벽송장번호양식 파일"
                    onChange={setDawnInvoiceFile}
                    id="dawn-invoice-file"
                    required
                  />
                  <p className="text-xs text-gray mt-1">
                    * 컬리넥스트마일에서 받은 새벽송장번호 데이터를 사용하세요.
                  </p>
                </div>
              </div>
              
              <div className="flex">
                <button
                  className="btn btn-primary"
                  onClick={handleDawnSubmit}
                  disabled={isDawnProcessing}
                >
                  {isDawnProcessing ? "새벽 매칭 중..." : "새벽 매칭 실행"}
                </button>
                
                <button
                  className="btn btn-outline ml-2"
                  onClick={resetDawnForm}
                  disabled={isDawnProcessing}
                >
                  초기화
                </button>
              </div>
              
              {isDawnProcessing && (
                <div className="mt-4">
                  <ProgressBar
                    progress={dawnProgress}
                    label="새벽배송 매칭 진행 중..."
                  />
                </div>
              )}
            </Card>
          </div>
          
          <div className="col-4">
            {dawnStats ? (
              <Card title="새벽배송 매칭 결과">
                <div className="mb-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="text-center p-3 bg-light-gray rounded-lg">
                      <div className="text-2xl font-bold text-primary">{dawnStats.total_orders}</div>
                      <div className="text-sm text-gray">총 주문 수</div>
                    </div>
                    
                    <div className="text-center p-3 bg-light-gray rounded-lg">
                      <div className="text-2xl font-bold text-success">{dawnStats.matched}</div>
                      <div className="text-sm text-gray">매칭 성공</div>
                    </div>
                    
                    <div className="text-center p-3 bg-light-gray rounded-lg">
                      <div className="text-2xl font-bold text-danger">{dawnStats.unmatched}</div>
                      <div className="text-sm text-gray">미매칭</div>
                    </div>
                    
                    <div className="text-center p-3 bg-light-gray rounded-lg">
                      <div className="text-2xl font-bold text-info">{dawnStats.match_rate}%</div>
                      <div className="text-sm text-gray">매칭률</div>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2">
                  {dawnMatchedLink && (
                    <a
                      href={dawnMatchedLink}
                      download
                      className="btn btn-primary text-center"
                    >
                      새벽 매칭완료 다운로드
                    </a>
                  )}
                  
                  {dawnUnmatchedLink && (
                    <a
                      href={dawnUnmatchedLink}
                      download
                      className="btn btn-outline text-center"
                    >
                      새벽 미매칭 다운로드
                    </a>
                  )}
                </div>
              </Card>
            ) : (
              <Card title="새벽배송 매칭 도움말">
                <ul className="list-disc ml-4">
                  <li className="mb-2">
                    <strong>새벽배송양식</strong>: 새벽옵션추가에서 생성된 파일을 사용하세요.
                  </li>
                  <li className="mb-2">
                    <strong>새벽송장번호양식</strong>: 컬리넥스트마일 송장 데이터를 사용하세요.
                  </li>
                  <li className="mb-2">
                    <strong>매칭 순서</strong>: 1) 상품주문번호 매칭 → 2) 이름+주소 유사도 매칭
                  </li>
                  <li className="mb-2">
                    <strong>유사도 기준</strong>: 이름 80% + 주소 80% 이상 시 매칭 성공
                  </li>
                </ul>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoicePage; 