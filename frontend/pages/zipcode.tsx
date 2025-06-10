import React, { useState, useEffect } from "react";
import axios from "axios";
import Head from "next/head";
import Card from "../components/Card";
import FileUpload from "../components/FileUpload";
import Alert from "../components/Alert";
import LoadingSpinner from "../components/LoadingSpinner";
import { useAuth } from "../components/AuthContext";

export default function ZipcodePage() {
  const { isAuthenticated, login, loading: authLoading } = useAuth();
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [dayFile, setDayFile] = useState<File | null>(null);
  const [dawnFile, setDawnFile] = useState<File | null>(null);
  const [info, setInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [alert, setAlert] = useState<{ type: "success" | "danger" | "warning" | "info"; message: string } | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [pendingUpload, setPendingUpload] = useState<{ type: "day" | "dawn"; file: File } | null>(null);

  // API 기본 URL 설정
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

  const fetchInfo = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`${API_URL}/zipcode/`);
      setInfo(res.data);
    } catch (error) {
      setAlert({
        type: "danger",
        message: "우편번호 정보를 불러오는데 실패했습니다."
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInfo();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    
    if (!password) {
      setLoginError("비밀번호를 입력해주세요.");
      return;
    }

    const success = await login(password);
    if (success) {
      setShowLoginModal(false);
      setPassword("");
      if (pendingUpload) {
        await uploadFile(pendingUpload.type, pendingUpload.file);
        setPendingUpload(null);
      }
    } else {
      setLoginError("비밀번호가 올바르지 않습니다.");
    }
  };

  const uploadFile = async (type: "day" | "dawn", file: File | null) => {
    if (!file) return;

    // 관리자 인증 확인
    if (!isAuthenticated) {
      setPendingUpload({ type, file });
      setShowLoginModal(true);
      return;
    }
    
    const formData = new FormData();
    formData.append("file", file);
    
    try {
      setAlert(null);
      const res = await axios.post(`${API_URL}/zipcode/${type}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.data.success) {
        setAlert({
          type: "success",
          message: `${type === "day" ? "당일" : "새벽"} 우편번호가 성공적으로 업로드되었습니다.`
        });
        fetchInfo();
        // 파일 선택 초기화
        if (type === "day") setDayFile(null);
        if (type === "dawn") setDawnFile(null);
      }
    } catch (error) {
      setAlert({
        type: "danger",
        message: `${type === "day" ? "당일" : "새벽"} 우편번호 업로드에 실패했습니다.`
      });
    }
  };

  return (
    <div className="zipcode-page">
              <Head>
          <title>우편번호 관리 - 허우적 배송분류 시스템</title>
          <meta name="description" content="당일배송과 새벽배송 가능 지역의 우편번호를 등록하고 관리합니다. CSV 파일 업로드를 통한 우편번호 데이터 관리 시스템입니다." />
          <meta name="keywords" content="우편번호관리, 당일배송, 새벽배송, CSV업로드, 지역관리, 배송지역" />
          <meta property="og:title" content="우편번호 관리 - 허우적 배송분류 시스템" />
          <meta property="og:description" content="당일배송과 새벽배송 가능 지역의 우편번호를 등록하고 관리합니다." />
          <meta property="og:url" content="https://delivery.example.com/zipcode" />
          <link rel="canonical" href="https://delivery.example.com/zipcode" />
        </Head>
      {/* 페이지 헤더 */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="flex items-center">
            <div className="icon-lg bg-primary text-white rounded-full flex items-center justify-center mr-3">
              🏠
            </div>
            <div>
              <h1 className="text-2xl font-bold mb-0">우편번호 관리</h1>
              <p className="text-gray mb-0">당일배송과 새벽배송 가능 지역의 우편번호를 관리합니다</p>
            </div>
          </div>
        </div>
      </div>
      
      {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

      <Card title="📊 현재 등록된 우편번호">
        {isLoading ? (
          <div className="text-center py-8">
            <LoadingSpinner />
            <p className="mt-4 text-gray">우편번호 정보를 불러오는 중...</p>
          </div>
        ) : info ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card bg-light">
              <div className="card-body text-center">
                <div className="text-3xl mb-2">🚚</div>
                <h3 className="font-bold text-lg text-primary">당일배송</h3>
                <div className="text-2xl font-bold text-success">{info.day_count}개</div>
                {info.day_filename && (
                  <div className="text-sm text-gray mt-2">파일: {info.day_filename}</div>
                )}
                {info.day_count > 0 && (
                  <button 
                    onClick={() => window.open('/api/zipcode/download/day', '_blank')}
                    className="btn btn-success btn-sm mt-3"
                  >
                    📥 다운로드
                  </button>
                )}
              </div>
            </div>
            
            <div className="card bg-light">
              <div className="card-body text-center">
                <div className="text-3xl mb-2">🌙</div>
                <h3 className="font-bold text-lg text-primary">새벽배송</h3>
                <div className="text-2xl font-bold text-info">{info.dawn_count}개</div>
                {info.dawn_filename && (
                  <div className="text-sm text-gray mt-2">파일: {info.dawn_filename}</div>
                )}
                {info.dawn_count > 0 && (
                  <button 
                    onClick={() => window.open('/api/zipcode/download/dawn', '_blank')}
                    className="btn btn-info btn-sm mt-3"
                  >
                    📥 다운로드
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">📭</div>
            <p className="text-gray">등록된 우편번호 정보가 없습니다.</p>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <Card title="🚚 당일배송 우편번호 등록">
          <div className="space-y-4">
            <FileUpload
              label="CSV 파일 선택"
              onChange={(file) => setDayFile(file)}
              accept=".csv"
              id="day-zipcode-file"
            />
            <button
              className="btn btn-primary w-full"
              onClick={() => uploadFile("day", dayFile)}
              disabled={!dayFile}
            >
              📤 업로드
            </button>
            {!isAuthenticated && (
              <div className="text-center text-sm text-gray">
                🔒 관리자 로그인이 필요합니다
              </div>
            )}
          </div>
        </Card>

        <Card title="🌙 새벽배송 우편번호 등록">
          <div className="space-y-4">
            <FileUpload
              label="CSV 파일 선택"
              onChange={(file) => setDawnFile(file)}
              accept=".csv"
              id="dawn-zipcode-file"
            />
            <button
              className="btn btn-primary w-full"
              onClick={() => uploadFile("dawn", dawnFile)}
              disabled={!dawnFile}
            >
              📤 업로드
            </button>
            {!isAuthenticated && (
              <div className="text-center text-sm text-gray">
                🔒 관리자 로그인이 필요합니다
              </div>
            )}
          </div>
        </Card>
      </div>
      
      {/* 로그인 모달 */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-90">
            <Card title="🔐 관리자 인증 필요">
              <form onSubmit={handleLogin} className="space-y-4">
                <p className="text-sm text-gray mb-4">
                  우편번호 업로드는 관리자만 사용할 수 있습니다.<br/>
                  관리자 비밀번호를 입력해주세요.
                </p>
                
                <div>
                  <label htmlFor="modal-password" className="block text-sm font-medium mb-2">
                    관리자 비밀번호
                  </label>
                  <input
                    type="password"
                    id="modal-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="form-input"
                    placeholder="관리자 비밀번호를 입력하세요"
                    autoFocus
                  />
                </div>
                
                {loginError && (
                  <Alert
                    type="danger"
                    message={loginError}
                    onClose={() => setLoginError("")}
                  />
                )}
                
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn btn-secondary flex-1"
                    onClick={() => {
                      setShowLoginModal(false);
                      setPendingUpload(null);
                      setPassword("");
                      setLoginError("");
                    }}
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary flex-1"
                    disabled={authLoading}
                  >
                    {authLoading ? "로그인 중..." : "로그인"}
                  </button>
                </div>
              </form>
            </Card>
          </div>
        </div>
      )}
      
      <Card title="📋 주의사항">
        <div className="space-y-2">
          <div className="flex items-start">
            <span className="text-blue-600 mr-2">ℹ️</span>
            <span className="text-sm">CSV 파일 형식: 한 줄에 하나의 우편번호만 입력되어 있어야 합니다.</span>
          </div>
          <div className="flex items-start">
            <span className="text-orange-600 mr-2">⚠️</span>
            <span className="text-sm">새 파일을 업로드하면 기존 우편번호는 모두 삭제되고 새로운 우편번호로 교체됩니다.</span>
          </div>
          <div className="flex items-start">
            <span className="text-red-600 mr-2">🔒</span>
            <span className="text-sm">우편번호 업로드는 관리자 권한이 필요합니다.</span>
          </div>
        </div>
      </Card>
    </div>
  );
} 