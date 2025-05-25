// App.js
import { useState, useCallback } from 'react';

const BUTTON_OFFSETS = {
    'A': 0x4C, 'B': 0x50, 'X': 0x54, 'Y': 0x58,
    'LB': 0x5C, 'RB': 0x60, 'LT': 0x64, 'RT': 0x68,
    'L3': 0x6C, 'R3': 0x70, 'BACK': 0x74, 'MENU': 0x78,
    'UP DPAD': 0x84, 'DOWN DPAD': 0x88, 'LEFT DPAD': 0x8C, 'RIGHT DPAD': 0x90,
    'PR': 0x94, 'PL': 0x98, 'L4': 0x9C, 'R4': 0xA0,
    'HOME (not tested)': 0x80
};

const ACTION_MAP = {
    'A': 0x00200000,
    'B': 0x00100000,
    'X': 0x10000000,
    'Y': 0x20000000,
    'LB': 0x00040000,
    'RB': 0x00080000,
    'LT': 0x00400000,
    'RT': 0x00800000,
    'L3': 0x02000000,
    'R3': 0x04000000,
    'BACK': 0x08000000,
    'MENU': 0x01000000,
    'UP_DPAD': 0x00020000,
    'DOWN_DPAD': 0x00010000,
    'LEFT_DPAD': 0x80000000,
    'RIGHT_DPAD': 0x40000000,
    'HOME': 0x00000200
};

const AVAILABLE_ACTIONS = Object.keys(ACTION_MAP);

// --- 다국어 지원을 위한 텍스트 정의 ---
const translations = {
    en: {
        appTitle: '🎮 Mapper for 8bitdo Ultimate 2',
        uploadSectionTitle: '1. Upload Configuration File',
        filePathNote: 'You can find the configuration file in: <strong>&lt;8BitDo Ultimate Software V2&gt;\\Config\\ProfileData\\Ultimate2\\Window</strong>',
        fileInputHelp: 'Select a file',
        selectedFile: 'Selected file:',
        messageFileLoaded: 'File successfully loaded. You can now modify the settings.',
        messageParsingError: 'File parsing error:',
        messageReadFileError: 'Error reading file.',
        messageSelectFile: 'Please select a file.',
        editSectionTitle: '2. Edit Button Mappings',
        currentMapping: 'Current Mapping:',
        none: 'None',
        more: ' more',
        downloadSectionTitle: '3. Download Modified File',
        fileNamePlaceholder: 'File name for download',
        downloadButton: 'Download File',
        generating: 'Generating...',
        messageDownloadReady: 'Modified file successfully downloaded!',
        messageDownloadError: 'File generation and download error:',
        messageLoadBeforeDownload: 'Please load a file and modify settings first.',
        fileNameNote: 'Note: manually add the ".ini" extension after downloading (e.g., `gamepad_config_edited_ini` → `gamepad_config_edited.ini`).',
        languageSwitch: '한국어', // Will display the name of the language to switch to
    },
    ko: {
        appTitle: '🎮 8bitdo Ultimate 2 맵핑 툴',
        uploadSectionTitle: '1. 설정 파일 업로드',
        filePathNote: '설정 파일은 다음 경로에서 찾을 수 있습니다: <strong>&lt;8BitDo Ultimate Software V2&gt;\\Config\\ProfileData\\Ultimate2\\Window</strong>',
        fileInputHelp: '파일 선택',
        selectedFile: '선택된 파일:',
        messageFileLoaded: '파일이 성공적으로 로드되었습니다. 설정을 변경해 보세요.',
        messageParsingError: '파일 파싱 오류:',
        messageReadFileError: '파일 읽기 오류가 발생했습니다.',
        messageSelectFile: '파일을 선택해 주세요.',
        editSectionTitle: '2. 버튼 매핑 편집',
        currentMapping: '현재 매핑:',
        none: '없음',
        more: '',
        downloadSectionTitle: '3. 변경된 파일 다운로드',
        fileNamePlaceholder: '다운로드할 파일 이름',
        downloadButton: '파일 다운로드',
        generating: '생성 중...',
        messageDownloadReady: '변경사항이 적용된 파일이 성공적으로 다운로드되었습니다!',
        messageDownloadError: '파일 생성 및 다운로드 오류:',
        messageLoadBeforeDownload: '먼저 파일을 로드하고 설정을 변경해야 합니다.',
        fileNameNote: '참고: 다운로드 후 파일 이름 끝에 ".ini" 확장자를 수동으로 붙여주세요. (예: `gamepad_config_edited_ini` → `gamepad_config_edited.ini`)',
        languageSwitch: 'English', // Will display the name of the language to switch to
    },
};

// 파싱 함수 (Uint8Array 사용)
function parseBinaryConfig(uint8Array) {
    const dataView = new DataView(uint8Array.buffer);
    const config = {};
    for (const buttonName in BUTTON_OFFSETS) {
        const offset = BUTTON_OFFSETS[buttonName];
        if (uint8Array.length < offset + 4) {
            console.warn(`Buffer too short for button ${buttonName} at offset ${offset}. Skipping.`);
            config[buttonName] = [];
            continue;
        }
        const value = dataView.getUint32(offset, false);
        const mappedActions = [];
        for (const actionName in ACTION_MAP) {
            const actionValue = ACTION_MAP[actionName];
            // eslint-disable-next-line no-bitwise
            if ((((value >>> 0) & (actionValue >>> 0)) >>> 0) === (actionValue >>> 0)) {
                mappedActions.push(actionName);
            }
        }
        config[buttonName] = mappedActions;
    }
    return config;
}

// 생성 함수 (Uint8Array 사용)
function createBinaryConfig(configJson, originalUint8Array) {
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
                        // eslint-disable-next-line no-bitwise
                        newValue |= ACTION_MAP[actionName];
                    }
                }
            }
            newDataView.setUint32(offset, newValue, false);
        }
    }
    return newUint8Array;
}

function App() {
    const [selectedFile, setSelectedFile] = useState(null);
    const [config, setConfig] = useState({});
    const [originalUint8Array, setOriginalUint8Array] = useState(null);
    const [fileName, setFileName] = useState('gamepad_config.bin');
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [expandedButton, setExpandedButton] = useState(null);
    const [language, setLanguage] = useState('en'); // Default language is English

    // Get current translation texts
    const t = translations[language];

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            setSelectedFile(file);

            const originalName = file.name;
            const lastDotIndex = originalName.lastIndexOf('.');
            let baseName;

            if (lastDotIndex > 0) {
                baseName = originalName.substring(0, lastDotIndex);
            } else {
                baseName = originalName;
            }

            const newFileName = `${baseName}_edited_ini`;
            
            setFileName(newFileName);
            setMessage('');
            setIsLoading(true);

            const reader = new FileReader();
            reader.onload = (e) => {
                const arrayBuffer = e.target.result;
                const uint8Array = new Uint8Array(arrayBuffer);
                try {
                    const parsedConfig = parseBinaryConfig(uint8Array);
                    setConfig(parsedConfig);
                    setOriginalUint8Array(uint8Array);
                    setMessage(t.messageFileLoaded); // Use translated message
                } catch (error) {
                    console.error('파일 파싱 중 오류:', error);
                    setMessage(`${t.messageParsingError} ${error.message}`); // Use translated message
                    setConfig({});
                    setOriginalUint8Array(null);
                } finally {
                    setIsLoading(false);
                }
            };
            reader.onerror = () => {
                setMessage(t.messageReadFileError); // Use translated message
                setIsLoading(false);
            };
            reader.readAsArrayBuffer(file);
        } else {
            setSelectedFile(null);
            setConfig({});
            setOriginalUint8Array(null);
            setMessage(t.messageSelectFile); // Use translated message
        }
    };


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

    const handleDownload = useCallback(() => {
        if (!originalUint8Array || !Object.keys(config).length) {
            setMessage(t.messageLoadBeforeDownload); // Use translated message
            return;
        }

        setIsLoading(true);
        setMessage(t.generating); // Use translated message

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
            setMessage(t.messageDownloadReady); // Use translated message
        } catch (error) {
            console.error('파일 생성 및 다운로드 오류:', error);
            setMessage(`${t.messageDownloadError} ${error.message}`); // Use translated message
        } finally {
            setIsLoading(false);
        }
    }, [config, originalUint8Array, fileName, t]); // Add 't' to dependencies

    const toggleExpand = useCallback((buttonName) => {
        setExpandedButton(prevExpanded => prevExpanded === buttonName ? null : buttonName);
    }, []);

    const getSortedActions = useCallback((buttonName) => {
        let defaultAction = buttonName;
        if (buttonName.includes('DPAD')) {
            defaultAction = buttonName.replace(' DPAD', '_DPAD');
        } else if (buttonName === 'HOME (not tested)') {
            defaultAction = 'HOME';
        }
        
        const sortedActions = [...AVAILABLE_ACTIONS].sort((a, b) => {
            if (a === defaultAction && b !== defaultAction) {
                return -1;
            }
            if (b === defaultAction && a !== defaultAction) {
                return 1;
            }
            return 0;
        });
        return sortedActions;
    }, []);

    const handleLanguageToggle = useCallback(() => {
        setLanguage(prevLang => prevLang === 'en' ? 'ko' : 'en');
        // Clear message when language changes, as messages are language-specific
        setMessage(''); 
    }, []);


    // JSX UI 렌더링
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-gray-100 p-6 font-inter antialiased">
            <div className="max-w-4xl mx-auto bg-gray-800 rounded-xl shadow-2xl p-8 space-y-8 border border-gray-700">
                {/* Language Toggle Button */}
                <div className="flex justify-end mb-4">
                    <button
                        onClick={handleLanguageToggle}
                        className="px-4 py-2 rounded-full bg-purple-600 text-white font-semibold hover:bg-purple-700 transition duration-200 ease-in-out shadow-md"
                    >
                        {t.languageSwitch}
                    </button>
                </div>

                <h1 className="text-4xl font-extrabold text-center text-purple-400 mb-8">
                    {t.appTitle}
                </h1>

                {/* 파일 업로드 섹션 */}
                <div className="bg-gray-700 p-6 rounded-lg shadow-inner border border-gray-600">
                    <h2 className="text-2xl font-semibold text-gray-200 mb-4">{t.uploadSectionTitle}</h2>
                    <p className="text-sm text-gray-400 mb-4" dangerouslySetInnerHTML={{ __html: t.filePathNote }}></p>
                    <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4">
                        <label className="block w-full text-sm text-white px-4 py-2 rounded-full font-semibold
                            bg-purple-600 hover:bg-purple-700 cursor-pointer text-center
                            transition duration-200 ease-in-out transform hover:scale-105 shadow-md">
                            <input
                                type="file"
                                accept=".ini"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                            {t.fileInputHelp}
                        </label>
                    </div>
                    {selectedFile && (
                        <p className="mt-4 text-sm text-gray-400">
                            {t.selectedFile} <span className="font-medium text-purple-300">{selectedFile.name}</span>
                        </p>
                    )}
                </div>

                {/* 메시지 표시 영역 */}
                {message && (
                    <div className={`p-4 rounded-lg text-center font-medium ${message.includes('오류') || message.includes('Error') ? 'bg-red-700 text-red-100' : 'bg-green-700 text-green-100'} shadow-md`}>
                        {message}
                    </div>
                )}

                {/* 설정 편집 섹션 */}
                {Object.keys(config).length > 0 && (
                    <div className="bg-gray-700 p-6 rounded-lg shadow-inner border border-gray-600">
                        <h2 className="text-2xl font-semibold text-gray-200 mb-4">{t.editSectionTitle}</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {Object.keys(BUTTON_OFFSETS).map((buttonName) => {
                                const currentMappedActions = config[buttonName] || [];
                                const isExpanded = expandedButton === buttonName;
                                const sortedActions = getSortedActions(buttonName);

                                return (
                                    <div key={buttonName} className="bg-gray-800 p-4 rounded-lg shadow-md border border-gray-700 relative">
                                        <h3
                                            className="text-lg font-bold text-purple-300 mb-3 cursor-pointer select-none flex justify-between items-center"
                                            onClick={() => toggleExpand(buttonName)}
                                        >
                                            <span>{buttonName}</span>
                                            <span className="text-gray-400 text-xl">{isExpanded ? '▲' : '▼'}</span>
                                        </h3>
                                        
                                        {!isExpanded && (
                                            <div className="text-gray-400 min-h-[24px]">
                                                {t.currentMapping} <span className="font-medium text-gray-200">
                                                    {currentMappedActions.length > 0
                                                        ? currentMappedActions[0].replace(/_/g, ' ')
                                                        : t.none}
                                                </span>
                                                {currentMappedActions.length > 1 && (
                                                    <span className="ml-2 text-sm text-gray-500">(+ {currentMappedActions.length - 1}{t.more})</span>
                                                )}
                                            </div>
                                        )}

                                        {isExpanded && (
                                            <div className="absolute top-full left-0 right-0 mt-1 p-4 bg-gray-700 rounded-lg shadow-xl z-20 border border-gray-600 max-h-60 overflow-y-auto">
                                                <div className="space-y-2">
                                                    {sortedActions.map((actionName) => (
                                                        <div key={`${buttonName}-${actionName}`} className="flex items-center">
                                                            <input
                                                                type="checkbox"
                                                                id={`${buttonName}-${actionName}`}
                                                                checked={currentMappedActions.includes(actionName) || false}
                                                                onChange={(e) => handleActionChange(buttonName, actionName, e.target.checked)}
                                                                className="form-checkbox h-5 w-5 text-purple-500 rounded focus:ring-purple-400 bg-gray-600 border-gray-500 cursor-pointer"
                                                            />
                                                            <label htmlFor={`${buttonName}-${actionName}`} className="ml-3 text-gray-300 cursor-pointer">
                                                                {actionName.replace(/_/g, ' ')}
                                                            </label>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* 파일 다운로드 섹션 */}
                {Object.keys(config).length > 0 && (
                    <div className="bg-gray-700 p-6 rounded-lg shadow-inner border border-gray-600">
                        <h2 className="text-2xl font-semibold text-gray-200 mb-4">{t.downloadSectionTitle}</h2>
                        <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4">
                            <input
                                type="text"
                                value={fileName}
                                onChange={(e) => setFileName(e.target.value)}
                                className="flex-grow p-3 rounded-lg bg-gray-900 text-gray-100 border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                                placeholder={t.fileNamePlaceholder}
                            />
                            <button
                                onClick={handleDownload}
                                disabled={isLoading || !Object.keys(config).length}
                                className={`w-full sm:w-auto px-8 py-3 rounded-full font-bold text-white
                                    ${!isLoading && Object.keys(config).length ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-500 cursor-not-allowed'}
                                    transition duration-200 ease-in-out transform hover:scale-105 shadow-lg`}
                            >
                                {isLoading ? t.generating : t.downloadButton}
                            </button>
                        </div>
                        <p className="mt-4 text-sm text-gray-400">
                            {t.selectedFile} <span className="font-medium text-purple-300">{fileName}</span>
                        </p>
                        <p className="mt-2 text-sm text-yellow-400" dangerouslySetInnerHTML={{ __html: t.fileNameNote }}></p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default App;