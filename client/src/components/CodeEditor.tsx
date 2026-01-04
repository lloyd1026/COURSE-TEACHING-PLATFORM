
import React from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { Loader2 } from 'lucide-react';

interface CodeEditorProps {
    value: string;
    onChange: (value: string | undefined) => void;
    language?: string;
    readOnly?: boolean;
    height?: string;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
    value,
    onChange,
    language = 'javascript',
    readOnly = false,
    height = '60vh'
}) => {
    // Map usage language to monaco language id if needed
    // 'c++' -> 'cpp' is handled by monaco usually as 'cpp'
    const monacoLang = language.toLowerCase() === 'c++' ? 'cpp' : language.toLowerCase();

    return (
        <div className="border rounded-md overflow-hidden bg-[#1e1e1e]" style={{ height }}>
            <Editor
                height={height}
                defaultLanguage="javascript"
                language={monacoLang}
                value={value}
                onChange={onChange}
                theme="vs-dark"
                options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    readOnly: readOnly,
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 4,
                }}
                loading={
                    <div className="flex flex-col items-center justify-center h-full text-white gap-2">
                        <Loader2 className="h-6 w-6 animate-spin" />
                        <span className="text-xs">Loading Editor...</span>
                    </div>
                }
            />
        </div>
    );
};
