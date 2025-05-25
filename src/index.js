import React from 'react';
import ReactDOM from 'react-dom/client'; // 또는 'react-dom' (Create React App 버전에 따라 다름)
import './index.css'; // 기본 CSS 파일이 있다면
import App from './App'; // App 컴포넌트를 불러옵니다.
import reportWebVitals from './reportWebVitals'; // 성능 측정 파일, 없다면 이 줄과 아래 호출은 삭제 가능

// React 18 이상 버전 (권장)
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// React 17 이하 버전 (이전 버전의 CRA를 사용한다면 위 코드 대신 아래 코드를 사용하세요)
// ReactDOM.render(
//   <React.StrictMode>
//     <App />
//   </React.StrictMode>,
//   document.getElementById('root')
// );


// 앱 성능 측정 (선택 사항)
reportWebVitals();