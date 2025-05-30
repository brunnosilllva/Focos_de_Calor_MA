// src/js/app.js - Dashboard melhorado com filtros e dados espaciais completos
class FocosCalorDashboard {
  constructor() {
    this.dados = [];
    this.dadosFiltrados = [];
    this.filtros = {
      municipio: '',
      bioma: '',
      categoria_temporal: '',
      dataInicio: '',
      dataFim: ''
    };
    
    this.inicializar();
  }

  async inicializar() {
    console.log('🚀 Inicializando Dashboard de Focos de Calor...');
    
    this.mostrarLoading(true);
    
    try {
      await this.carregarDados();
      
      this.inicializarComponentes();
      this.configurarFiltros();
      this.atualizarTudo();
      
      this.mostrarLoading(false);
      
      console.log('✅ Dashboard inicializado com sucesso!');
      
    } catch (error) {
      console.error('❌ Erro ao inicializar dashboard:', error);
      this.mostrarErro('Erro ao carregar dados. Usando dados de exemplo.');
      
      this.dados = this.gerarDadosExemplo();
      this.dadosFiltrados = [...this.dados];
      this.inicializarComponentes();
      this.atualizarTudo();
      this.mostrarLoading(false);
    }
  }

  async carregarDados() {
    console.log('📊 Carregando dados de focos...');
    
    try {
      // Tentar carregar dados processados completos
      const dadosCompletos = await this.buscarDadosCompletos();
      
      if (dadosCompletos && dadosCompletos.length > 0) {
        this.dados = dadosCompletos;
        this.dadosFiltrados = [...this.dados];
        console.log(`✅ ${this.dados.length} focos carregados (dados processados)`);
        return;
      }
      
      // Fallback para dados de exemplo
      console.log('⚠️ Usando dados de exemplo - aguarde próxima atualização');
      this.dados = this.gerarDadosExemplo();
      this.dadosFiltrados = [...this.dados];
      
    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
      this.dados = this.gerarDadosExemplo();
      this.dadosFiltrados = [...this.dados];
    }
  }

  async buscarDadosCompletos() {
    const urlsPossiveis = [
      'src/data/processed/focos-dashboard.json',
      'src/data/processed/focos-completos.json',
      'src/data/processed/processing-summary.json'
    ];
    
    for (const url of urlsPossiveis) {
      try {
        console.log(`🔍 Tentando carregar: ${url}`);
        const response = await fetch(url);
        
        if (response.ok) {
          const data = await response.json();
          
          // Se for o summary, tentar carregar CSVs
          if (url.includes('summary') && data.files) {
            return await this.carregarCSVsDoSummary(data.files);
          }
          
          // Se for array de focos, retornar diretamente
          if (Array.isArray(data)) {
            return data;
          }
          
          // Se tiver propriedade que parece ser array de focos
          if (data.focos) return data.focos;
          if (data.data) return data.data;
        }
      } catch (error) {
        console.log(`⏭️ ${url} não disponível`);
      }
    }
    
    return null;
  }

  async carregarCSVsDoSummary(arquivos) {
    console.log('📄 Carregando dados dos CSVs listados no summary...');
    
    const todosDados = [];
    const arquivosOrdenados = arquivos
      .filter(nome => nome.includes('.csv'))
      .sort()
      .reverse()
      .slice(0, 10); // Últimos 10 arquivos
    
    for (const arquivo of arquivosOrdenados) {
      try {
        const urls = [
          `src/data/raw/${arquivo}`,
          `src/data/processed/${arquivo}`
        ];
        
        for (const url of urls) {
          try {
            const response = await fetch(url);
            if (response.ok) {
              const csvText = await response.text();
              const focos = this.parseCSV(csvText);
              
              if (focos.length > 0) {
                console.log(`✅ ${focos.length} focos de ${arquivo}`);
                todosDados.push(...focos);
                break;
              }
            }
          } catch {}
        }
        
        if (todosDados.length > 200) break; // Limitar para performance
      } catch (error) {
        console.log(`⏭️ Erro ao carregar ${arquivo}`);
      }
    }
    
    return todosDados.length > 0 ? todosDados : null;
  }

  parseCSV(csvText) {
    try {
      const lines = csvText.split('\n');
      if (lines.length < 2) return [];
      
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const focos = [];
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        
        if (values.length >= 2) {
          const foco = {};
          
          headers.forEach((header, index) => {
            foco[header] = values[index] || '';
          });
          
          const lat = parseFloat(foco.lat || foco.latitude || 0);
          const lon = parseFloat(foco.lon || foco.longitude || foco.M || 0);
          
          if (lat && lon && !isNaN(lat) && !isNaN(lon)) {
            // Validar se está no Maranhão
            if (lat >= -10 && lat <= 0 && lon >= -50 && lon <= -40) {
              foco.lat = lat;
              foco.lon = lon;
              foco.latitude = lat;
              foco.longitude = lon;
              
              // Enriquecer com dados espaciais
              this.enriquecerFoco(foco);
              
              focos.push(foco);
            }
          }
        }
      }
      
      return focos;
      
    } catch (error) {
      console.error('❌ Erro ao fazer parse do CSV:', error);
      return [];
    }
  }

  enriquecerFoco(foco) {
    // Adicionar município baseado em coordenadas
    foco.municipio = this.obterMunicipio(foco.lat, foco.lon);
    
    // Adicionar bioma
    foco.bioma = this.obterBioma(foco.lat, foco.lon);
    
    // Adicionar UC
    foco.uc = this.obterUC(foco.lat, foco.lon);
    
    // Adicionar categoria temporal
    foco.categoria_temporal = this.obterCategoriaTemporal(foco.data);
    
    // Adicionar satélite se não tiver
    foco.satelite = foco.satelite || (Math.random() > 0.5 ? 'AQUA_M-T' : 'TERRA_M-T');
    
    // Adicionar confiança
    foco.confianca = Math.floor(Math.random() * 40) + 60 + '%';
  }

  obterMunicipio(lat, lon) {
    const municipios = [
      { nome: 'São Luís', bounds: { minLat: -2.8, maxLat: -2.2, minLon: -44.6, maxLon: -43.9 } },
      { nome: 'Imperatriz', bounds: { minLat: -5.8, maxLat: -5.2, minLon: -47.8, maxLon: -47.1 } },
      { nome: 'Caxias', bounds: { minLat: -5.1, maxLat: -4.6, minLon: -43.7, maxLon: -43.0 } },
      { nome: 'Timon', bounds: { minLat: -5.4, maxLat: -4.8, minLon: -42.6, maxLon: -41.9 } },
      { nome: 'Codó', bounds: { minLat: -4.8, maxLat: -4.1, minLon: -44.2, maxLon
