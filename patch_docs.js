const fs = require('fs');
let code = fs.readFileSync('app/docs/page.tsx', 'utf8');

// Replace everything inside the main return with just the rapidoc component
const newRender = `  return (
    <div className="w-full h-screen bg-white">
      <main className="w-full h-full relative">
        <rapi-doc
          id="rapidoc-el"
          theme="light"
          render-style="read"
          show-header="false"
          allow-server-selection="false"
          allow-authentication="false"
          allow-try="true"
          primary-color="#2563eb"
          bg-color="#ffffff"
          text-color="#1e293b"
          nav-bg-color="#f8fafc"
          nav-text-color="#334155"
          nav-hover-bg-color="#e2e8f0"
          nav-hover-text-color="#0f172a"
          nav-accent-color="#2563eb"
          style={{ width: '100%', height: '100%', display: 'block' }}
        >
        </rapi-doc>
      </main>
    </div>
  );`;

code = code.replace(/return \([\s\S]*?\);/, newRender);
// Remove state variables and unused imports
code = code.replace(/const \[isModalOpen.*?;\n/g, '');
code = code.replace(/const \[apiKey.*?;\n/g, '');
code = code.replace(/const \[status.*?;\n/g, '');
code = code.replace(/const \[inputKey.*?;\n/g, '');
code = code.replace(/const \[showKey.*?;\n/g, '');
code = code.replace(/const \[errorMessage.*?;\n/g, '');
code = code.replace(/const rapidocRef = useRef<HTMLElement \| null>\(null\);\n/, '');
code = code.replace(/useEffect\(\(\) => \{[\s\S]*?\}\s*\}, \[\]\);\n/g, '');
code = code.replace(/useEffect\(\(\) => \{[\s\S]*?\}\s*\}, \[apiKey, status, isModalOpen\]\);\n/g, '');
code = code.replace(/const handleSaveKey = \(\) => \{[\s\S]*?\}\n\n/g, '');
code = code.replace(/const handleClearKey = \(\) => \{[\s\S]*?\}\n\n/g, '');
code = code.replace(/const handleAuthSubmit = \(e: React.FormEvent\) => \{[\s\S]*?\}\n\n/g, '');

fs.writeFileSync('app/docs/page.tsx', code);
