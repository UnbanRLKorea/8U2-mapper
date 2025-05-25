// App.js
import React, { useState, useCallback } from 'react';

// --- BUTTON_OFFSETS 및 ACTION_MAP 정의 (이전 대화에서 확정된 값들) ---
// 이 부분에 실제 오프셋과 액션 맵핑 값을 정확히 채워 넣어야 합니다.
const BUTTON_OFFSETS = {
    'A': 0x4C, 'B': 0x50, 'X': 0x54, 'Y': 0x58,
    'LB': 0x5C, 'RB': 0x60, 'LT': 0x64, 'RT': 0x68,
    'L3': 0x6C, 'R3': 0x70, 'BACK': 0x74, 'MENU': 0x78,
    'HOME': 0x80, 'UP DPAD': 0x84, 'DOWN DPAD': 0x88, 'LEFT DPAD': 0x8C, 'RIGHT DPAD': 0x90,
    'PR': 0x94, 'PL': 0x98, 'L4': 0x9C, 'R4': 0xA0
};

// 각 액션에 해당하는 4바이트 16진수 값 (Big Endian으로 해석)
// 이 값들은 비트 OR 연산으로 조합될 수 있습니다.
const ACTION_MAP = {
    'Y': 0x20000000,
    'X': 0x10000000,
    'A': 0x00200000,
    'B': 0x00100000,
    'RIGHT_DPAD': 0x40000000, // →
    'LEFT_DPAD': 0x80000000,  // ←
    'DOWN_DPAD': 0x00010000,  // ↓
    'UP_DPAD': 0x00020000,    // ↑
    'L3_CLICK': 0x02000000,   // L3
    'LB_BUTTON': 0x00040000,  // LB
    'LT_TRIGGER': 0x00400000, // LT
    'RB_BUTTON': 0x00080000,  // RB
    'RT_TRIGGER': 0x00800000, // RT
    'BACK_BUTTON': 0x08000000, // BACK
    'R3_CLICK': 0x04000000,   // R3
    'MENU_BUTTON': 0x01000000, // MENU
    'HOME_BUTTON': 0x00000200  // HOME
};

// UI에 표시될 액션 이름 목록 (체크박스 렌더링용)
const AVAILABLE_ACTIONS = Object.keys(ACTION_MAP);

// 파싱 함수 (Uint8Array 사용)
function parseBinaryConfig(uint8Array) {
    const dataView = new DataView(uint8Array.buffer);
    const config = {};
    for (const buttonName in BUTTON_OFFSETS) {
        const offset = BUTTON_OFFSETS[buttonName];
        // 버퍼의 크기가 오프셋 + 4바이트보다 작으면 오류
        if (uint8Array.length < offset + 4) {
            console.warn(`Buffer too short for button ${buttonName} at offset ${offset}. Skipping.`);
            config[buttonName] = []; // 빈 배열로 처리
            continue;
        }
        const value = dataView.getUint32(offset, false); // 4바이트, Big Endian으로 읽기
        const mappedActions = [];
        for (const actionName in ACTION_MAP) {
            const actionValue = ACTION_MAP[actionName];
            if (((value >>> 0) & (actionValue >>> 0)) === (actionValue >>> 0)) {
                mappedActions.push(actionName);
            }
        }
        config[buttonName] = mappedActions;
    }
    return config;
}

// 생성 함수 (Uint8Array 사용)
function createBinaryConfig(configJson, originalUint8Array) {
    // 원본 Uint8Array를 복사하여 새로운 Uint8Array 생성
    const newUint8Array = new Uint8Array(originalUint8Array);
    const newDataView = new DataView(newUint8Array.buffer);
    for (const buttonName in configJson) {
        if (BUTTON_OFFSETS.hasOwnProperty(buttonName)) {
            const offset = BUTTON_OFFSETS[buttonName];
            const actions = configJson[buttonName];
            let newValue = 0;
            if (Array.isArray(actions)) {
                for (const actionName of actions) {
                    if (ACTION_MAP.hasOwnProperty(actionName)) {
                        newValue |= ACTION_MAP[actionName];
                    }
                }
            }
            newDataView.setUint32(offset, newValue, false); // 4바이트, Big Endian으로 쓰기
        }
    }
    return newUint8Array;
}

function App() {
    const [selectedFile, setSelectedFile] = useState(null);
    const [config, setConfig] = useState({});
    const [originalUint8Array, setOriginalUint8Array] = useState(null); // 원본 Uint8Array 저장
    const [fileName, setFileName] = useState('gamepad_config.bin');
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // handleFileChange 구현
    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            setSelectedFile(file);
            setFileName(file.name);
            setMessage('');
            setIsLoading(true);

            const reader = new FileReader();
            reader.onload = (e) => {
                const arrayBuffer = e.target.result;
                const uint8Array = new Uint8Array(arrayBuffer);
                try {
                    const parsedConfig = parseBinaryConfig(uint8Array);
                    setConfig(parsedConfig);
                    setOriginalUint8Array(uint8Array); // 원본 저장
                    setMessage('파일이 성공적으로 로드되었습니다. 설정을 변경해 보세요.');
                } catch (error) {
                    console.error('파일 파싱 중 오류:', error);
                    setMessage(`파일 파싱 오류: ${error.message}`);
                    setConfig({});
                    setOriginalUint8Array(null);
                } finally {
                    setIsLoading(false);
                }
            };
            reader.onerror = () => {
                setMessage('파일 읽기 오류가 발생했습니다.');
                setIsLoading(false);
            };
            reader.readAsArrayBuffer(file);
        } else {
            setSelectedFile(null);
            setConfig({});
            setOriginalUint8Array(null);
            setMessage('파일을 선택해 주세요.');
        }
    };

    // handleActionChange 구현 (이전과 동일)
    const handleActionChange = useCallback((buttonName, actionName, isChecked) => {
        setConfig(prevConfig => {
            const currentActions = prevConfig[buttonName] || [];
            let newActions;
            if (isChecked) {
                newActions = [...new Set([...currentActions, actionName])];
            } else {
                newActions = currentActions.filter(action => action !== actionName);
            }
            return {
                ...prevConfig,
                [buttonName]: newActions,
            };
        });
    }, []);

    // handleDownload 구현
    const handleDownload = useCallback(() => {
        if (!originalUint8Array || !Object.keys(config).length) {
            setMessage('먼저 파일을 로드하고 설정을 변경해야 합니다.');
            return;
        }

        setIsLoading(true);
        setMessage('변경사항을 적용하고 파일을 생성하고 있습니다...');

        try {
            const newBinaryUint8Array = createBinaryConfig(config, originalUint8Array);
            const blob = new Blob([newBinaryUint8Array], { type: 'application/octet-stream' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            setMessage('변경사항이 적용된 파일이 성공적으로 다운로드되었습니다!');
        } catch (error) {
            console.error('파일 생성 및 다운로드 오류:', error);
            setMessage(`파일 생성 및 다운로드 오류: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    }, [config, originalUint8Array, fileName]);

    // JSX UI 렌더링
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-gray-100 p-6 font-inter antialiased">
            <div className="max-w-4xl mx-auto bg-gray-800 rounded-xl shadow-2xl p-8 space-y-8 border border-gray-700">
                <h1 className="text-4xl font-extrabold text-center text-purple-400 mb-8">
                    🎮 게임패드 설정 에디터
                </h1>

                {/* 파일 업로드 섹션 */}
                <div className="bg-gray-700 p-6 rounded-lg shadow-inner border border-gray-600">
                    <h2 className="text-2xl font-semibold text-gray-200 mb-4">1. 설정 파일 업로드</h2>
                    <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4">
                        <input
                            type="file"
                            accept=".ini"
                            onChange={handleFileChange}
                            className="block w-full text-sm text-gray-300
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-full file:border-0
                            file:text-sm file:font-semibold
                            file:bg-purple-500 file:text-white
                            hover:file:bg-purple-600 cursor-pointer"
                        />
                        {/* 파일 업로드 버튼은 handleFileChange에 통합되었으므로 별도의 버튼은 필요 없습니다. */}
                    </div>
                    {selectedFile && (
                        <p className="mt-4 text-sm text-gray-400">
                            선택된 파일: <span className="font-medium text-purple-300">{selectedFile.name}</span>
                        </p>
                    )}
                </div>

                {/* 메시지 표시 영역 */}
                {message && (
                    <div className={`p-4 rounded-lg text-center font-medium ${message.includes('오류') ? 'bg-red-700 text-red-100' : 'bg-green-700 text-green-100'} shadow-md`}>
                        {message}
                    </div>
                )}

                {/* 설정 편집 섹션 */}
                {Object.keys(config).length > 0 && (
                    <div className="bg-gray-700 p-6 rounded-lg shadow-inner border border-gray-600">
                        <h2 className="text-2xl font-semibold text-gray-200 mb-4">2. 버튼 매핑 편집</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {Object.keys(BUTTON_OFFSETS).map((buttonName) => (
                                <div key={buttonName} className="bg-gray-800 p-4 rounded-lg shadow-md border border-gray-700">
                                    <h3 className="text-lg font-bold text-purple-300 mb-3">{buttonName} 버튼</h3>
                                    <div className="space-y-2">
                                        {AVAILABLE_ACTIONS.map((actionName) => (
                                            <div key={`${buttonName}-${actionName}`} className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    id={`${buttonName}-${actionName}`}
                                                    checked={config[buttonName]?.includes(actionName) || false}
                                                    onChange={(e) => handleActionChange(buttonName, actionName, e.target.checked)}
                                                    className="form-checkbox h-5 w-5 text-purple-500 rounded focus:ring-purple-400 bg-gray-600 border-gray-500 cursor-pointer"
                                                />
                                                <label htmlFor={`${buttonName}-${actionName}`} className="ml-3 text-gray-300 cursor-pointer">
                                                    {actionName.replace(/_/g, ' ')} {/* 언더스코어 제거하여 표시 */}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 파일 다운로드 섹션 */}
                {Object.keys(config).length > 0 && (
                    <div className="bg-gray-700 p-6 rounded-lg shadow-inner border border-gray-600">
                        <h2 className="text-2xl font-semibold text-gray-200 mb-4">3. 변경된 파일 다운로드</h2>
                        <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4">
                            <input
                                type="text"
                                value={fileName}
                                onChange={(e) => setFileName(e.target.value)}
                                className="flex-grow p-3 rounded-lg bg-gray-900 text-gray-100 border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                                placeholder="다운로드할 파일 이름"
                            />
                            <button
                                onClick={handleDownload}
                                disabled={isLoading || !Object.keys(config).length}
                                className={`w-full sm:w-auto px-8 py-3 rounded-full font-bold text-white
                                    ${!isLoading && Object.keys(config).length ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-500 cursor-not-allowed'}
                                    transition duration-200 ease-in-out transform hover:scale-105 shadow-lg`}
                            >
                                {isLoading ? '생성 중...' : '파일 다운로드'}
                            </button>
                        </div>
                        <p className="mt-4 text-sm text-gray-400">
                            다운로드될 파일 이름: <span className="font-medium text-purple-300">{fileName}</span>
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default App;
