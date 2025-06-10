import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import Head from "next/head";
import { ToastContainer, useToast } from "../components/Toast";
import ProgressBar from "../components/ProgressBar";
import {
  DatabaseIcon,
  FolderIcon,
  FileIcon,
  ExcelIcon,
  TrashIcon,
  DownloadIcon,
  CleanIcon,
  RefreshIcon,
  UploadIcon,
  CheckIcon
} from "../components/Icons";
import Card from "../components/Card";
import Alert from "../components/Alert";
import { useAuth } from "../components/AuthContext";

interface FileInfo {
  filename: string;
  size: number;
  last_modified: number;
  is_system: boolean;
}

const DataManagementPage: React.FC = () => {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isCleaning, setIsCleaning] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [dragOver, setDragOver] = useState<boolean>(false);
  
  const { toasts, removeToast, showSuccess, showError, showInfo, showWarning } = useToast();

  // API 기본 URL 설정
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

  const fetchFiles = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await axios.get(`${API_URL}/data/list`);
      setFiles(res.data);
      setSelectedFiles([]);
      setSelectAll(false);
    } catch (error) {
      console.error("파일 목록 조회 실패:", error);
      showError('파일 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [API_URL]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  // 파일 선택 관련 로직
  useEffect(() => {
    if (selectAll) {
      setSelectedFiles(files.map(f => f.filename));
    } else {
      if (selectedFiles.length === files.length && files.length > 0) {
        setSelectedFiles([]);
      }
    }
  }, [selectAll, files]);

  useEffect(() => {
    if (files.length > 0 && selectedFiles.length === files.length) {
      setSelectAll(true);
    } else {
      setSelectAll(false);
    }
  }, [selectedFiles, files]);

  const handleFileUpload = async (uploadedFiles: FileList) => {
    if (!uploadedFiles || uploadedFiles.length === 0) return;

    const file = uploadedFiles[0];
    try {
      setIsUploading(true);
      setUploadProgress(0);
      
      const formData = new FormData();
      formData.append("file", file);
      
      const res = await axios.post(`${API_URL}/data/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
          setUploadProgress(progress);
        }
      });
      
      if (res.data.success) {
        showSuccess(`${file.name} 파일이 성공적으로 업로드되었습니다.`);
        fetchFiles();
      }
    } catch (error) {
      console.error("파일 업로드 실패:", error);
      showError('파일 업로드 중 오류가 발생했습니다.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDownload = async (filename: string) => {
    try {
      // API 키 파일은 관리자 전용 엔드포인트 사용
      const isApiKeyFile = filename === "api_key.txt";
      const endpoint = isApiKeyFile ? 
        `${API_URL}/data/download-admin/${filename}` : 
        `${API_URL}/data/download/${filename}`;
      
      if (isApiKeyFile) {
        // API 키 파일의 경우 axios로 먼저 인증 확인
        try {
          const response = await axios.get(endpoint, { 
            responseType: 'blob',
            timeout: 5000 
          });
          
          // 성공적으로 받았다면 다운로드 진행
          const url = window.URL.createObjectURL(new Blob([response.data]));
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          
          showSuccess(`${filename} 다운로드가 완료되었습니다.`);
        } catch (error: any) {
          if (error.response?.status === 401 || error.response?.status === 403) {
            showWarning('API 키 파일은 관리자만 다운로드할 수 있습니다. API키관리 메뉴에서 관리자 로그인 후 이용하세요.');
          } else {
            showError('파일 다운로드 중 오류가 발생했습니다.');
          }
          return;
        }
      } else {
        // 일반 파일은 기존 방식 사용
        const link = document.createElement('a');
        link.href = endpoint;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showInfo(`${filename} 다운로드를 시작합니다.`);
      }
    } catch (error) {
      showError('파일 다운로드 중 오류가 발생했습니다.');
    }
  };

  const handleMultipleDownload = async () => {
    if (selectedFiles.length === 0) {
      showWarning('다운로드할 파일을 선택해주세요.');
      return;
    }

    let successCount = 0;
    let failCount = 0;
    
    for (const filename of selectedFiles) {
      try {
        // API 키 파일은 관리자 전용 엔드포인트 사용
        const isApiKeyFile = filename === "api_key.txt";
        const endpoint = isApiKeyFile ? 
          `${API_URL}/data/download-admin/${filename}` : 
          `${API_URL}/data/download/${filename}`;
        
        if (isApiKeyFile) {
          // API 키 파일의 경우 axios로 먼저 인증 확인
          try {
            const response = await axios.get(endpoint, { 
              responseType: 'blob',
              timeout: 5000 
            });
            
            // 성공적으로 받았다면 다운로드 진행
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            
            successCount++;
          } catch (error: any) {
            if (error.response?.status === 401 || error.response?.status === 403) {
              showWarning(`${filename}은 관리자만 다운로드할 수 있습니다.`);
            }
            failCount++;
          }
        } else {
          // 일반 파일은 기존 방식 사용
          const link = document.createElement('a');
          link.href = endpoint;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          successCount++;
        }
      } catch (error) {
        failCount++;
      }
    }
    
    if (successCount > 0) {
      showSuccess(`${successCount}개 파일 다운로드가 완료되었습니다.`);
    }
    if (failCount > 0) {
      showWarning(`${failCount}개 파일 다운로드에 실패했습니다.`);
    }
  };

  const handleDelete = async (filename: string) => {
    if (!window.confirm(`${filename} 파일을 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const res = await axios.delete(`${API_URL}/data/clean/${filename}`);
      
      if (res.data.success) {
        showSuccess(`${filename} 파일이 삭제되었습니다.`);
        fetchFiles();
      }
    } catch (error: any) {
      console.error("파일 삭제 실패:", error);
      if (error.response?.status === 403) {
        if (error.response?.data?.detail?.includes('시스템 파일')) {
          showWarning(`${filename}은 시스템 파일로 삭제할 수 없습니다.`);
        } else {
          showWarning(`${filename} 파일의 삭제 권한이 없습니다.`);
        }
      } else if (error.response?.status === 404) {
        showWarning(`${filename} 파일을 찾을 수 없습니다.`);
      } else {
        showError('파일 삭제 중 오류가 발생했습니다.');
      }
    }
  };

  const handleCleanFiles = async () => {
    if (!window.confirm('모든 결과 파일을 삭제하시겠습니까? (시스템 파일은 보호됩니다)')) {
      return;
    }

    try {
      setIsCleaning(true);
      const res = await axios.delete(`${API_URL}/data/clean`);
      
      if (res.data.success) {
        showSuccess(`${res.data.deleted_count}개 파일이 삭제되었습니다.`);
        fetchFiles();
      }
    } catch (error) {
      console.error("파일 정리 실패:", error);
      showError('파일 정리 중 오류가 발생했습니다.');
    } finally {
      setIsCleaning(false);
    }
  };

  const handleMultipleDelete = async () => {
    if (selectedFiles.length === 0) {
      showWarning('삭제할 파일을 선택해주세요.');
      return;
    }

    // 시스템 파일과 일반 파일 분리
    const systemFiles = selectedFiles.filter(filename => {
      const file = files.find(f => f.filename === filename);
      return file?.is_system;
    });
    const regularFiles = selectedFiles.filter(filename => {
      const file = files.find(f => f.filename === filename);
      return !file?.is_system;
    });

    let confirmMessage = '';
    if (systemFiles.length > 0 && regularFiles.length > 0) {
      confirmMessage = `선택된 ${selectedFiles.length}개 파일 중 ${regularFiles.length}개 파일만 삭제됩니다.\n(${systemFiles.length}개 시스템 파일은 삭제할 수 없습니다)\n\n계속하시겠습니까?`;
    } else if (systemFiles.length > 0) {
      showWarning('선택된 파일들은 모두 시스템 파일로 삭제할 수 없습니다.');
      return;
    } else {
      confirmMessage = `선택한 ${selectedFiles.length}개 파일을 삭제하시겠습니까?`;
    }

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      let successCount = 0;
      let failCount = 0;
      let systemFileCount = 0;
      const systemFiles: string[] = [];

      for (const filename of selectedFiles) {
        try {
          const res = await axios.delete(`${API_URL}/data/clean/${filename}`);
          if (res.data.success) {
            successCount++;
          }
        } catch (error: any) {
          if (error.response?.status === 403 && 
              error.response?.data?.detail?.includes('시스템 파일')) {
            systemFileCount++;
            systemFiles.push(filename);
          } else {
            failCount++;
          }
        }
      }

      // 결과 메시지 표시
      const messages: string[] = [];
      if (successCount > 0) {
        messages.push(`${successCount}개 파일이 삭제되었습니다.`);
      }
      if (systemFileCount > 0) {
        messages.push(`${systemFileCount}개 시스템 파일은 삭제할 수 없습니다.`);
      }
      if (failCount > 0) {
        messages.push(`${failCount}개 파일 삭제에 실패했습니다.`);
      }

      if (messages.length > 0) {
        if (successCount > 0 && (systemFileCount > 0 || failCount > 0)) {
          showWarning(messages.join(' '));
        } else if (successCount > 0) {
          showSuccess(messages.join(' '));
        } else {
          showWarning(messages.join(' '));
        }
      }
      
      fetchFiles();
    } catch (error) {
      showError('파일 삭제 중 오류가 발생했습니다.');
    }
  };

  const toggleFileSelection = (filename: string) => {
    setSelectedFiles(prev => 
      prev.includes(filename) 
        ? prev.filter(f => f !== filename)
        : [...prev, filename]
    );
  };

  const toggleSelectAll = () => {
    setSelectAll(!selectAll);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (unixTimestamp: number): string => {
    const date = new Date(unixTimestamp * 1000);
    
    // 모바일에서는 더 간단한 형식 사용
    if (window.innerWidth <= 768) {
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) return '오늘';
      if (diffDays === 2) return '어제';
      if (diffDays <= 7) return `${diffDays-1}일 전`;
      
      return date.toLocaleDateString('ko-KR', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
    
    return date.toLocaleString('ko-KR');
  };

  const getFileIcon = (filename: string, isSystem: boolean) => {
    if (isSystem) {
      return <div className="file-icon system">SYS</div>;
    }
    
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'xlsx' || ext === 'xls') {
      return <div className="file-icon excel">XL</div>;
    } else if (ext === 'csv') {
      return <div className="file-icon csv">CSV</div>;
    } else {
      return <div className="file-icon other">FILE</div>;
    }
  };

  const getFileType = (filename: string, isSystem: boolean) => {
    if (isSystem) return 'system';
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'xlsx' || ext === 'xls') return 'excel';
    if (ext === 'csv') return 'csv';
    return 'other';
  };

  const getFileStatus = (filename: string, isSystem: boolean) => {
    if (filename === "api_key.txt") {
      return <span className="file-status security">🔒 보안</span>;
    }
    if (isSystem) {
      return <span className="file-status system">⚙️ 시스템</span>;
    }
    if (filename.includes('템플릿') || filename.includes('template')) {
      return <span className="file-status template">📋 템플릿</span>;
    }
    return <span className="file-status result">📊 결과</span>;
  };

  return (
    <div className="data-management-container">
      <Head>
        <title>데이터 관리 - 허우적 배송분류 시스템</title>
        <meta name="description" content="배송분류 시스템의 업로드된 파일들을 관리합니다. 결과 파일 다운로드, 삭제, 일괄 정리 기능을 제공합니다." />
        <meta name="keywords" content="데이터관리, 파일관리, 결과파일, 다운로드, 삭제, 시스템파일" />
        <meta property="og:title" content="데이터 관리 - 허우적 배송분류 시스템" />
        <meta property="og:description" content="배송분류 시스템의 업로드된 파일들을 관리합니다. 결과 파일 다운로드, 삭제, 일괄 정리 기능을 제공합니다." />
        <meta property="og:url" content="https://delivery.example.com/data-management" />
        <link rel="canonical" href="https://delivery.example.com/data-management" />
      </Head>
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
      
      {/* 페이지 헤더 */}
      <div className="card mb-4">
        <div className="card-header">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <DatabaseIcon size={24} />
              <h1 className="page-title ml-2 mb-0">데이터 관리</h1>
            </div>
            <div className="flex gap-2">
              <button 
                className="btn btn-outline header-btn"
                onClick={fetchFiles}
                disabled={isLoading}
              >
                <RefreshIcon size={16} />
                <span className="header-btn-text ml-1">새로고침</span>
              </button>
              <button 
                className="btn btn-danger header-btn"
                onClick={handleCleanFiles}
                disabled={isCleaning || isLoading}
              >
                <CleanIcon size={16} />
                <span className="header-btn-text ml-1">{isCleaning ? '정리 중...' : '전체 정리'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 파일 업로드 영역 */}
      <div className="card mb-4">
        <div className="card-body">
          <div 
            className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.onchange = (e) => {
                const files = (e.target as HTMLInputElement).files;
                if (files) handleFileUpload(files);
              };
              input.click();
            }}
          >
            <UploadIcon size={48} color="#667eea" />
            <h3>파일을 드래그하여 업로드하거나 클릭하세요</h3>
            <p className="text-gray">Excel, CSV 파일을 지원합니다</p>
            
            {isUploading && (
              <div className="mt-4" style={{ width: '300px' }}>
                <ProgressBar 
                  progress={uploadProgress} 
                  label="업로드 중..." 
                  color="primary"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 파일 목록 제어 */}
      {files.length > 0 && (
        <div className="card mb-4">
          <div className="card-body">
            <div className="flex justify-between items-center file-controls">
              <div className="flex items-center">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={toggleSelectAll}
                    className="mr-2"
                  />
                  <span className="font-bold select-text">전체 선택</span>
                  <span className="ml-2 text-gray count-text">({selectedFiles.length}/{files.length})</span>
                </label>
              </div>
              
              <div className="flex gap-2 control-buttons">
                <button 
                  className="btn btn-secondary control-btn"
                  onClick={handleMultipleDownload}
                  disabled={selectedFiles.length === 0}
                >
                  <DownloadIcon size={16} />
                  <span className="control-btn-text ml-1">선택 다운로드</span>
                </button>
                <button 
                  className="btn btn-danger control-btn"
                  onClick={handleMultipleDelete}
                  disabled={selectedFiles.length === 0}
                >
                  <TrashIcon size={16} />
                  <span className="control-btn-text ml-1">선택 삭제</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 로딩 상태 */}
      {isLoading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
        </div>
      )}

      {/* 파일 목록 */}
      <div className="grid grid-cols-1 gap-4">
        {files.map((file) => (
          <div key={file.filename} className="card file-card">
            <div className="card-body file-card-body">
              <div className="file-item">
                <div className="file-main-info">
                  <input
                    type="checkbox"
                    checked={selectedFiles.includes(file.filename)}
                    onChange={() => toggleFileSelection(file.filename)}
                    className="file-checkbox"
                  />
                  {getFileIcon(file.filename, file.is_system)}
                  <div className="file-details">
                    <div className="file-name-row">
                      <h3 className="file-name">{file.filename}</h3>
                      {getFileStatus(file.filename, file.is_system)}
                    </div>
                    <div className="file-meta">
                      <span className="file-size">📁 {formatFileSize(file.size)}</span>
                      <span className="file-date">🕒 {formatDate(file.last_modified)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="file-actions">
                  <button
                    className="btn btn-secondary btn-sm file-action-btn"
                    onClick={() => handleDownload(file.filename)}
                    title={file.filename === "api_key.txt" ? "관리자 인증이 필요한 파일입니다" : "파일 다운로드"}
                  >
                    <DownloadIcon size={14} />
                    <span className="file-btn-text">
                      {file.filename === "api_key.txt" ? "관리자 다운로드" : "다운로드"}
                    </span>
                  </button>
                  {file.is_system ? (
                    <span className="delete-disabled" title="시스템 파일은 삭제할 수 없습니다">
                      🔒 삭제불가
                    </span>
                  ) : (
                    <button
                      className="btn btn-danger btn-sm file-action-btn"
                      onClick={() => handleDelete(file.filename)}
                    >
                      <TrashIcon size={14} />
                      <span className="file-btn-text">삭제</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 빈 상태 */}
      {!isLoading && files.length === 0 && (
        <div className="card">
          <div className="card-body text-center p-5">
            <FolderIcon size={64} color="#ddd" />
            <h3 className="mt-4 text-gray">저장된 파일이 없습니다</h3>
            <p className="text-gray">위의 업로드 영역을 사용하여 파일을 업로드해보세요.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataManagementPage; 