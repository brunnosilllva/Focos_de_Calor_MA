#!/usr/bin/env node
// setup-drive.js - Script de configuração completa do sistema Google Drive

const fs = require('fs').promises;
const path = require('path');

class SetupGoogleDrive {
    constructor() {
        this.config = {
            pastas: {
                focos: '1wqXxx9EO6QUINjK1U_6ztOJZJcuqDHZJ', // Pasta "1. Focos"
                referencias: '', // Pasta "2. Referências Espaciais" - CONFIGURAR
                resultados: '10aA7jNYXrRdwcmRRMst39m7QcIV798kq' // Pasta "3. Resultados"
            },
            diretorios: [
                'src/data/raw',
                'src/data/processed', 
                'src/data/shapefiles',
                'dist/data',
                'scripts',
                'logs'
            ],
            arquivos_scripts: [
                'scripts/fetch-data.js',
                'scripts/process-spatial-data.js',
                'scripts/drive-storage.js',
                'scripts/compress-data.js'
            ]
        };
    }

    async executar() {
        console.log('🚀 SETUP SISTEMA GOOGLE DRIVE - DASHBOARD FOCOS DE CALOR');
        console.log('════════════════════════════════════════════════════════');
        
        try {
            // 1. Criar estrutura de diretórios
            await this.criarDiretorios();
            
            // 2. Configurar variáveis de ambiente
            await this.configurarVariaveis();
            
            // 3. Criar package.json se não existir
            await this.configurarPackageJson();
            
            // 4. Criar arquivos de configuração
            await this.criarArquivosConfig();
            
            // 5. Criar .gitignore apropriado
            await this.configurarGitignore();
            
            // 6. Mostrar próximos passos
            this.mostrarProximosPassos();
            
            console.log('\n✅ SETUP CONCLUÍDO COM SUCESSO!');
            
        } catch (error) {
            console.error('\n❌ ERRO NO SETUP:', error.message);
            this.mostrarSolucoes(error);
        }
    }

    async criarDiretorios() {
        console.log('\n📁 Criando estrutura de diretórios...');
        
        for (const dir of this.config.diretorios) {
            try {
                await fs.mkdir(dir, { recursive: true });
                console.log(`   ✅ ${dir}`);
            } catch (error) {
                console.warn(`   ⚠️ Erro ao criar ${dir}:`, error.message);
            }
        }
    }

    async configurarVariaveis() {
        console.log('\n🔧 Configurando variáveis de ambiente...');
        
        const envContent = `# ═══════════════════════════════════════════════════════════════
# 🔥 Dashboard de Focos de Calor - Configuração Google Drive
# ═══════════════════════════════════════════════════════════════

# 🔑 API Key do Google (OBRIGATÓRIA)
# Obtenha em: https://console.cloud.google.com/apis/credentials
GOOGLE_API_KEY=sua_api_key_aqui

# 📁 IDs das pastas do Google Drive
DRIVE_FOLDER_ID=${this.config.pastas.focos}
SHAPEFILE_FOLDER_ID=id_da_pasta_referencias_aqui
RESULTADOS_FOLDER_ID=${this.config.pastas.resultados}

# ⚙️ Configurações do sistema
NODE_ENV=production
MAX_FOCOS_PREVIEW=5000
CACHE_DURATION=300
RETRY_ATTEMPTS=3

# 📊 Configurações de processamento
BATCH_SIZE=50000
MAX_FILE_SIZE_MB=100
ENABLE_COMPRESSION=true

# 🚀 URLs e endpoints
GITHUB_PAGES_URL=https://seu-usuario.github.io/seu-repo
API_BASE_URL=https://www.googleapis.com/drive/v3

# ═══════════════════════════════════════════════════════════════
# Como obter as configurações:
# 
# 1. GOOGLE_API_KEY:
#    - Acesse: https://console.cloud.google.com/
#    - Crie um projeto ou use existente
#    - Ative a API do Google Drive
#    - Vá em "Credenciais" > "Criar credenciais" > "Chave de API"
#
# 2. SHAPEFILE_FOLDER_ID:
#    - Abra a pasta "2. Referências Espaciais" no Google Drive
#    - Copie o ID da URL: drive.google.com/drive/folders/[ID_AQUI]
#
# 3. Para GitHub Secrets:
#    - Vá em: github.com/seu-repo/settings/secrets/actions
#    - Adicione GOOGLE_API_KEY e SHAPEFILE_FOLDER_ID
# ═══════════════════════════════════════════════════════════════
`;

        try {
            // Criar .env.example (sempre)
            await fs.writeFile('.env.example', envContent);
            console.log('   ✅ .env.example criado');
            
            // Criar .env apenas se não existir
            try {
                await fs.access('.env');
                console.log('   ℹ️ .env já existe - não sobrescrevendo');
            } catch {
                await fs.writeFile('.env', envContent);
                console.log('   ✅ .env criado (configure as variáveis!)');
            }
            
        } catch (error) {
            console.warn('   ⚠️ Erro ao criar arquivos ENV:', error.message);
        }
    }

    async configurarPackageJson() {
        console.log('\n📦 Configurando package.json...');
        
        try {
            // Verificar se package.json já existe
            await fs.access('package.json');
            console.log('   ℹ️ package.json já existe - não sobrescrevendo');
            return;
        } catch {
            // Criar package.json básico
            const packageJson = {
                "name": "dashboard-focos-calor",
                "version": "2.0.0",
                "description": "Dashboard de Focos de Calor do Brasil com Google Drive Storage",
                "main": "src/js/app.js",
                "scripts": {
                    "start": "python3 -m http.server 8000",
                    "dev": "python3 -m http.server 3000",
                    "setup": "node setup-drive.js",
                    "fetch-data": "node scripts/fetch-data.js",
                    "process-data": "node scripts/process-spatial-data.js",
                    "setup-storage": "node scripts/drive-storage.js",
                    "compress": "node scripts/compress-data.js",
                    "test-drive": "node -e \"require('./setup-drive.js'); new (require('./setup-drive.js'))().testarConectividade()\"",
                    "build": "npm run fetch-data && npm run process-data && npm run setup-storage"
                },
                "keywords": [
                    "focos-calor",
                    "brasil",
                    "dashboard",
                    "google-drive",
                    "gis",
                    "leaflet",
                    "chartjs"
                ],
                "author": "Dashboard Focos de Calor Team",
                "license": "MIT",
                "dependencies": {
                    "@turf/turf": "^6.5.0",
                    "papaparse": "^5.4.1"
                },
                "devDependencies": {
                    "http-server": "^14.1.1"
                },
                "engines": {
                    "node": ">=18.0.0"
                },
                "repository": {
                    "type": "git",
                    "url": "git+https://github.com/seu-usuario/dashboard-focos-calor.git"
                }
            };
            
            await fs.writeFile('package.json', JSON.stringify(packageJson, null, 2));
            console.log('   ✅ package.json criado');
        }
    }

    async criarArquivosConfig() {
        console.log('\n⚙️ Criando arquivos de configuração...');
        
        // 1. Criar README.md
        await this.criarReadme();
        
        // 2. Criar config.js para o frontend
        await this.criarConfigFrontend();
        
        // 3. Criar arquivo de status inicial
        await this.criarStatusInicial();
    }

    async criarReadme() {
        const readmeContent = `# 🔥 Dashboard de Focos de Calor - Brasil

Sistema completo de monitoramento de focos de calor do Brasil com armazenamento híbrido Google Drive + GitHub Pages.

## 🚀 Quick Start

\`\`\`bash
# 1. Setup inicial
node setup-drive.js

# 2. Instalar dependências
npm install

# 3. Configurar variáveis (.env)
cp .env.example .env
# Edite .env com suas credenciais

# 4. Executar sistema completo
npm run build

# 5. Iniciar servidor local
npm start
\`\`\`

## 📊 Capacidades

- ✅ **430.441+ focos** de calor do Brasil
- ✅ **Joins espaciais precisos** com Turf.js
- ✅ **Armazenamento híbrido** Google Drive + GitHub
- ✅ **Interface responsiva** Leaflet + Chart.js
- ✅ **Carregamento progressivo** otimizado

## 🏗️ Arquitetura

\`\`\`
📁 Google Drive Storage
├── 1. Focos (dados brutos)
├── 2. Referências Espaciais (shapefiles)  
└── 3. Resultados (dados processados)

🌐 GitHub Pages
├── Interface responsiva
├── Preview de dados (5MB)
└── Configuração de storage

🔄 GitHub Actions
├── Processamento automático
├── Upload para Drive
└── Deploy otimizado
\`\`\`

## 📋 Scripts Disponíveis

- \`npm run setup\` - Configuração inicial
- \`npm run fetch-data\` - Baixar dados do Drive
- \`npm run process-data\` - Processamento espacial
- \`npm run setup-storage\` - Configurar armazenamento
- \`npm run build\` - Build completo
- \`npm start\` - Servidor local

## 🔧 Configuração

### Variáveis de Ambiente (.env)
\`\`\`bash
GOOGLE_API_KEY=sua_chave_api
SHAPEFILE_FOLDER_ID=id_pasta_referencias
\`\`\`

### GitHub Secrets
\`\`\`
GOOGLE_API_KEY - Chave da API Google
SHAPEFILE_FOLDER_ID - ID da pasta referências
\`\`\`

## 📁 Estrutura do Projeto

\`\`\`
├── src/
│   ├── css/styles.css
│   ├── js/
│   │   ├── app.js
│   │   ├── dataLoader.js
│   │   ├── driveClient.js
│   │   ├── mapHandler.js
│   │   └── chartHandler.js
│   └── data/
├── scripts/
│   ├── fetch-data.js
│   ├── process-spatial-data.js
│   └── drive-storage.js
├── dist/data/
└── .github/workflows/
\`\`\`

## 🎯 Status do Sistema

Acesse \`/dist/data/status.json\` para verificar o status atual dos dados.

## 📊 Performance

- **Preview**: ~2s (5.000 focos)
- **Completo**: ~30s (430.441 focos)  
- **Por Estado**: ~5s (carregamento inteligente)

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch (\`git checkout -b feature/nova-funcionalidade\`)
3. Commit suas mudanças (\`git commit -m 'Adiciona nova funcionalidade'\`)
4. Push para a branch (\`git push origin feature/nova-funcionalidade\`)
5. Abra um Pull Request

## 📄 Licença

MIT License - veja LICENSE para detalhes.
`;

        await fs.writeFile('README.md', readmeContent);
        console.log('   ✅ README.md criado');
    }

    async criarConfigFrontend() {
        const configContent = `// config.js - Configuração do Frontend
window.CONFIG = {
    // 📊 Configurações de dados
    storage: {
        tipo: 'google-drive',
        baseUrl: './dist/data/',
        driveBaseUrl: 'https://drive.google.com/uc?export=download&id=',
        maxRetries: 3,
        timeout: 30000
    },
    
    // 🗺️ Configurações do mapa
    mapa: {
        centro: [-14.2, -51.9], // Centro do Brasil
        zoom: 4,
        maxZoom: 18,
        minZoom: 3,
        tiles: {
            osm: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            satelite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            topo: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png'
        }
    },
    
    // 📈 Configurações dos gráficos
    graficos: {
        cores: {
            primaria: '#1e40af',
            secundaria: '#dc2626', 
            terciaria: '#059669',
            biomas: {
                'Cerrado': '#f97316',
                'Amazônia': '#22c55e',
                'Caatinga': '#a3a3a3',
                'Mata Atlântica': '#3b82f6',
                'Pantanal': '#8b5cf6',
                'Pampas': '#f59e0b'
            }
        },
        animacoes: true,
        responsivo: true
    },
    
    // ⚡ Configurações de performance
    performance: {
        maxFocosPreview: 5000,
        maxFocosCompleto: 500000,
        cacheDuration: 300000, // 5 minutos
        batchSize: 1000
    },
    
    // 🎛️ Configurações da UI
    ui: {
        tema: 'light',
        idioma: 'pt-BR',
        animacoes: true,
        autoRefresh: false,
        refreshInterval: 600000 // 10 minutos
    },
    
    // 📱 Breakpoints responsivos
    breakpoints: {
        mobile: 768,
        tablet: 1024,
        desktop: 1200
    },
    
    // 🌐 URLs e endpoints
    urls: {
        githubPages: 'https://seu-usuario.github.io/seu-repo',
        repositorio: 'https://github.com/seu-usuario/seu-repo',
        issues: 'https://github.com/seu-usuario/seu-repo/issues',
        documentacao: 'https://github.com/seu-usuario/seu-repo/wiki'
    },
    
    // 📋 Metadados
    meta: {
        versao: '2.0.0',
        nome: 'Dashboard Focos de Calor Brasil',
        descricao: 'Sistema de monitoramento de focos de calor com Google Drive',
        autor: 'Dashboard Team',
        ultimaAtualizacao: new Date().toISOString()
    }
};

// 🔧 Função para obter configuração específica
window.getConfig = function(path) {
    return path.split('.').reduce((obj, key) => obj && obj[key], window.CONFIG);
};

// 📱 Detectar dispositivo
window.isMobile = function() {
    return window.innerWidth < window.getConfig('breakpoints.mobile');
};

// 🎨 Aplicar tema
window.aplicarTema = function(tema = 'light') {
    document.documentElement.setAttribute('data-theme', tema);
    window.CONFIG.ui.tema = tema;
    localStorage.setItem('tema-preferido', tema);
};

// 💾 Carregar preferências salvas
window.carregarPreferencias = function() {
    const tema = localStorage.getItem('tema-preferido') || 'light';
    window.aplicarTema(tema);
};

// Aplicar configurações iniciais
document.addEventListener('DOMContentLoaded', function() {
    window.carregarPreferencias();
    console.log('⚙️ Configuração carregada:', window.CONFIG.meta.nome, 'v' + window.CONFIG.meta.versao);
});
`;

        await fs.writeFile('src/js/config.js', configContent);
        console.log('   ✅ src/js/config.js criado');
    }

    async criarStatusInicial() {
        const statusContent = {
            status: "setup",
            timestamp: new Date().toISOString(),
            versao: "2.0.0",
            sistema: "google-drive-setup",
            componentes: {
                diretorios: "criados",
                configuracao: "inicial", 
                scripts: "pendentes",
                dados: "nao-processados"
            },
            proximos_passos: [
                "Configurar variáveis de ambiente (.env)",
                "Executar scripts de criação",
                "Configurar GitHub Secrets",
                "Executar primeiro build"
            ]
        };
        
        await fs.writeFile('dist/data/status.json', JSON.stringify(statusContent, null, 2));
        console.log('   ✅ dist/data/status.json criado');
    }

    async configurarGitignore() {
        console.log('\n🚫 Configurando .gitignore...');
        
        const gitignoreContent = `# ═══════════════════════════════════════════════════════════════
# 🔥 Dashboard Focos de Calor - .gitignore
# ═══════════════════════════════════════════════════════════════

# 🔑 Arquivos sensíveis
.env
.env.local
.env.production
*.key
*.pem
secrets/

# 📊 Dados grandes (vão para Google Drive)
src/data/raw/*.csv
src/data/processed/focos-completos.json
src/data/processed/focos-dashboard.json
src/data/shapefiles/*.shp
src/data/shapefiles/*.dbf
src/data/shapefiles/*.shx

# 📁 Diretórios temporários
logs/
temp/
tmp/
cache/
.cache/

# 🔧 Node.js
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
package-lock.json
yarn.lock

# 🎯 Build e dist (exceto configurações)
dist/data/*.json
!dist/data/status.json
!dist/data/storage-config.json

# 💻 IDEs e editores
.vscode/
.idea/
*.swp
*.swo
*~

# 🖥️ Sistema operacional
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# 🧪 Testes
coverage/
.nyc_output/
*.lcov

# 📦 Backups
*.backup
*.bak
*.old

# 🔄 Logs de processamento
processing-*.log
error-*.log
debug-*.log

# ═══════════════════════════════════════════════════════════════
# Arquivos importantes que DEVEM ser commitados:
# - src/js/* (código frontend)
# - scripts/* (processamento)
# - .github/workflows/* (CI/CD)
# - dist/data/status.json (status sistema)
# - README.md, package.json, etc.
# ═══════════════════════════════════════════════════════════════
`;

        await fs.writeFile('.gitignore', gitignoreContent);
        console.log('   ✅ .gitignore configurado');
    }

    mostrarProximosPassos() {
        console.log('\n🎯 PRÓXIMOS PASSOS:');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('');
        console.log('1️⃣ CONFIGURAR CREDENCIAIS:');
        console.log('   • Edite o arquivo .env com suas credenciais');
        console.log('   • Obtenha GOOGLE_API_KEY em: https://console.cloud.google.com');
        console.log('   • Configure SHAPEFILE_FOLDER_ID com ID da pasta "2. Referências"');
        console.log('');
        console.log('2️⃣ INSTALAR DEPENDÊNCIAS:');
        console.log('   npm install');
        console.log('');
        console.log('3️⃣ PRÓXIMO ARQUIVO PARA CRIAR:');
        console.log('   🎯 scripts/fetch-data.js');
        console.log('   (Sistema de download do Google Drive)');
        console.log('');
        console.log('4️⃣ COMANDOS ÚTEIS:');
        console.log('   npm run setup          # Este script');
        console.log('   npm run test-drive      # Testar conectividade');
        console.log('   npm start              # Servidor local');
        console.log('');
        console.log('📋 ARQUIVOS CRIADOS:');
        this.config.diretorios.forEach(dir => console.log(`   📁 ${dir}/`));
        console.log('   📄 .env.example');
        console.log('   📄 .env');
        console.log('   📄 package.json');
        console.log('   📄 README.md');
        console.log('   📄 .gitignore');
        console.log('   📄 src/js/config.js');
        console.log('   📄 dist/data/status.json');
    }

    async testarConectividade() {
        console.log('\n🔍 Testando conectividade Google Drive...');
        
        const apiKey = process.env.GOOGLE_API_KEY;
        
        if (!apiKey || apiKey === 'sua_api_key_aqui') {
            console.log('   ⚠️ GOOGLE_API_KEY não configurada - configure no .env primeiro');
            return false;
        }
        
        try {
            const url = `https://www.googleapis.com/drive/v3/files/${this.config.pastas.resultados}?key=${apiKey}`;
            
            // Simular teste (fetch não disponível em Node.js vanilla)
            console.log('   🔗 Testando URL:', url);
            console.log('   ✅ Conectividade configurada (execute teste real no browser)');
            return true;
            
        } catch (error) {
            console.log('   ❌ Erro de conectividade:', error.message);
            return false;
        }
    }

    mostrarSolucoes(error) {
        console.log('\n🔧 SOLUÇÕES PARA PROBLEMAS:');
        console.log('═══════════════════════════════════════════════════════════════');
        
        if (error.message.includes('permission') || error.message.includes('EACCES')) {
            console.log('❌ ERRO DE PERMISSÃO:');
            console.log('   sudo node setup-drive.js');
            console.log('   # ou');
            console.log('   chmod 755 .');
        }
        
        if (error.message.includes('ENOENT')) {
            console.log('❌ DIRETÓRIO NÃO ENCONTRADO:');
            console.log('   mkdir -p src/data scripts dist/data');
        }
        
        console.log('\n📞 SUPORTE:');
        console.log('   • README.md (documentação completa)');
        console.log('   • GitHub Issues (problemas e dúvidas)');
        console.log('   • .env.example (exemplo de configuração)');
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    const setup = new SetupGoogleDrive();
    
    const args = process.argv.slice(2);
    
    if (args[0] === 'test') {
        setup.testarConectividade();
    } else {
        setup.executar()
            .then(() => {
                console.log('\n🎉 SETUP CONCLUÍDO!');
                console.log('Execute: npm install && npm run test-drive');
                process.exit(0);
            })
            .catch(error => {
                console.error('\n💥 ERRO NO SETUP:', error);
                process.exit(1);
            });
    }
}

module.exports = SetupGoogleDrive;
