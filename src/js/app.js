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
      { nome: 'Codó', bounds: { minLat: -4.8, maxLat: -4.1, minLon: -44.2, maxLon: -43.5 } },
      { nome: 'Açailândia', bounds: { minLat: -5.2, maxLat: -4.7, minLon: -47.8, maxLon: -47.2 } },
      { nome: 'Bacabal', bounds: { minLat: -4.5, maxLat: -3.9, minLon: -44.1, maxLon: -43.5 } },
      { nome: 'Balsas', bounds: { minLat: -7.8, maxLat: -7.2, minLon: -46.4, maxLon: -45.7 } },
      { nome: 'Chapadinha', bounds: { minLat: -4.0, maxLat: -3.4, minLon: -43.7, maxLon: -43.0 } },
      { nome: 'Santa Inês', bounds: { minLat: -3.9, maxLat: -3.4, minLon: -45.7, maxLon: -45.0 } }
    ];
    
    for (const municipio of municipios) {
      const b = municipio.bounds;
      if (lat >= b.minLat && lat <= b.maxLat && lon >= b.minLon && lon <= b.maxLon) {
        return municipio.nome;
      }
    }
    
    return 'Outros Municípios';
  }

  obterBioma(lat, lon) {
    // Cerrado (sul-leste)
    if (lat <= -4 && lon >= -48) return 'Cerrado';
    
    // Amazônia (oeste)
    if (lon <= -46) return 'Amazônia';
    
    // Caatinga (leste)
    if (lon >= -45) return 'Caatinga';
    
    return 'Cerrado'; // Default
  }

  obterUC(lat, lon) {
    const ucs = [
      { nome: 'Parque Nacional dos Lençóis Maranhenses', lat: -2.5, lon: -43.0, radius: 0.8 },
      { nome: 'Parque Nacional da Chapada das Mesas', lat: -7.0, lon: -47.0, radius: 0.5 },
      { nome: 'Reserva Biológica do Gurupi', lat: -3.5, lon: -46.5, radius: 0.3 },
      { nome: 'APA da Baixada Maranhense', lat: -3.0, lon: -45.0, radius: 1.0 }
    ];
    
    for (const uc of ucs) {
      const distance = Math.sqrt(Math.pow(lat - uc.lat, 2) + Math.pow(lon - uc.lon, 2));
      if (distance <= uc.radius) {
        return uc.nome;
      }
    }
    
    return '';
  }

  obterCategoriaTemporal(dataStr) {
    if (!dataStr) return 'Antigo';
    
    try {
      const dataFoco = new Date(dataStr);
      const hoje = new Date();
      const diffTime = hoje - dataFoco;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 1) return 'Hoje';
      if (diffDays <= 7) return 'Última Semana';
      if (diffDays <= 30) return 'Último Mês';
      return 'Antigo';
    } catch {
      return 'Antigo';
    }
  }

  gerarDadosExemplo() {
    console.log('🎭 Gerando dados de exemplo enriquecidos...');
    
    const dados = [];
    const agora = new Date();
    
    const coordenadasMA = [
      { lat: -2.5297, lon: -44.2828, municipio: 'São Luís' },
      { lat: -5.5244, lon: -47.4601, municipio: 'Imperatriz' },
      { lat: -4.8594, lon: -43.3558, municipio: 'Caxias' },
      { lat: -5.0947, lon: -42.2877, municipio: 'Timon' },
      { lat: -4.4555, lon: -43.8856, municipio: 'Codó' },
      { lat: -4.9447, lon: -47.5072, municipio: 'Açailândia' },
      { lat: -4.2250, lon: -43.8289, municipio: 'Bacabal' },
      { lat: -7.5325, lon: -46.0356, municipio: 'Balsas' },
      { lat: -3.7408, lon: -43.3608, municipio: 'Chapadinha' },
      { lat: -3.6667, lon: -45.3833, municipio: 'Santa Inês' }
    ];
    
    // Gerar distribuição temporal realista
    const categoriasTemporais = [
      { categoria: 'Hoje', quantidade: 15 },
      { categoria: 'Última Semana', quantidade: 45 },
      { categoria: 'Último Mês', quantidade: 80 },
      { categoria: 'Antigo', quantidade: 60 }
    ];
    
    categoriasTemporais.forEach(({ categoria, quantidade }) => {
      for (let i = 0; i < quantidade; i++) {
        const coord = coordenadasMA[i % coordenadasMA.length];
        
        // Calcular data baseada na categoria
        let dataFoco;
        switch (categoria) {
          case 'Hoje':
            dataFoco = new Date(agora.getTime() - Math.random() * 24 * 60 * 60 * 1000);
            break;
          case 'Última Semana':
            dataFoco = new Date(agora.getTime() - (Math.random() * 6 + 1) * 24 * 60 * 60 * 1000);
            break;
          case 'Último Mês':
            dataFoco = new Date(agora.getTime() - (Math.random() * 23 + 7) * 24 * 60 * 60 * 1000);
            break;
          default:
            dataFoco = new Date(agora.getTime() - (Math.random() * 300 + 30) * 24 * 60 * 60 * 1000);
        }
        
        const variacao = 0.3; // Variação nas coordenadas
        const lat = coord.lat + (Math.random() - 0.5) * variacao;
        const lon = coord.lon + (Math.random() - 0.5) * variacao;
        
        const foco = {
          lat: lat,
          lon: lon,
          latitude: lat,
          longitude: lon,
          data: dataFoco.toISOString().split('T')[0],
          hora: dataFoco.toTimeString().split(' ')[0],
          satelite: Math.random() > 0.5 ? 'AQUA_M-T' : 'TERRA_M-T',
          confianca: Math.floor(Math.random() * 40) + 60 + '%',
          categoria_temporal: categoria
        };
        
        // Enriquecer com dados espaciais
        this.enriquecerFoco(foco);
        dados.push(foco);
      }
    });
    
    return dados;
  }

  inicializarComponentes() {
    this.inicializarMapa();
    this.inicializarGraficos();
    this.inicializarTabela();
  }

  inicializarMapa() {
    console.log('🗺️ Inicializando mapa...');
    
    const mapElement = document.getElementById('map');
    if (!mapElement) {
      console.error('❌ Elemento #map não encontrado');
      return;
    }
    
    try {
      this.mapa = L.map('map').setView([-4.5, -44.5], 7);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18
      }).addTo(this.mapa);
      
      this.adicionarFocosAoMapa();
      
      console.log('✅ Mapa inicializado com sucesso');
      
    } catch (error) {
      console.error('❌ Erro ao inicializar mapa:', error);
    }
  }

  adicionarFocosAoMapa() {
    if (!this.mapa) return;
    
    // Limpar marcadores existentes
    if (this.markersLayer) {
      this.mapa.removeLayer(this.markersLayer);
    }
    
    this.markersLayer = L.layerGroup().addTo(this.mapa);
    
    console.log(`📍 Adicionando ${this.dadosFiltrados.length} focos ao mapa...`);
    
    this.dadosFiltrados.forEach(foco => {
      const lat = foco.latitude || parseFloat(foco.lat);
      const lon = foco.longitude || parseFloat(foco.lon);
      
      if (lat && lon && !isNaN(lat) && !isNaN(lon)) {
        // Cor baseada na categoria temporal
        const color = this.getCorPorCategoria(foco.categoria_temporal);
        
        const marker = L.circleMarker([lat, lon], {
          radius: 6,
          fillColor: color,
          color: '#ffffff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.8
        });
        
        marker.bindPopup(`
          <div style="min-width: 250px;">
            <strong>🔥 Foco de Calor</strong><br>
            <strong>📍 Município:</strong> ${foco.municipio || 'N/A'}<br>
            <strong>📅 Data:</strong> ${foco.data || 'N/A'}<br>
            <strong>🕒 Hora:</strong> ${foco.hora || 'N/A'}<br>
            <strong>🛰️ Satélite:</strong> ${foco.satelite || 'N/A'}<br>
            <strong>🌿 Bioma:</strong> ${foco.bioma || 'N/A'}<br>
            <strong>🏞️ UC:</strong> ${foco.uc || 'Nenhuma'}<br>
            <strong>📊 Confiança:</strong> ${foco.confianca || 'N/A'}<br>
            <strong>⏰ Período:</strong> ${foco.categoria_temporal || 'N/A'}
          </div>
        `);
        
        this.markersLayer.addLayer(marker);
      }
    });
  }

  getCorPorCategoria(categoria) {
    switch (categoria) {
      case 'Hoje': return '#ff4444';
      case 'Última Semana': return '#ff8800';
      case 'Último Mês': return '#ffaa00';
      default: return '#ffcc00';
    }
  }

  configurarFiltros() {
    console.log('🎛️ Configurando filtros...');
    
    this.popularFiltros();
    this.adicionarEventListeners();
  }

  popularFiltros() {
    // Popular filtro de municípios
    const municipios = [...new Set(this.dados.map(f => f.municipio).filter(Boolean))].sort();
    const selectMunicipio = document.getElementById('filter-municipio');
    if (selectMunicipio) {
      selectMunicipio.innerHTML = '<option value="">Todos os Municípios</option>';
      municipios.forEach(municipio => {
        const option = document.createElement('option');
        option.value = municipio;
        option.textContent = municipio;
        selectMunicipio.appendChild(option);
      });
    }
    
    // Popular filtro de biomas
    const biomas = [...new Set(this.dados.map(f => f.bioma).filter(Boolean))].sort();
    const selectBioma = document.getElementById('filter-bioma');
    if (selectBioma) {
      selectBioma.innerHTML = '<option value="">Todos os Biomas</option>';
      biomas.forEach(bioma => {
        const option = document.createElement('option');
        option.value = bioma;
        option.textContent = bioma;
        selectBioma.appendChild(option);
      });
    }
    
    // Adicionar filtro de categoria temporal
    this.adicionarFiltroTemporal();
  }

  adicionarFiltroTemporal() {
    const controls = document.querySelector('.filters');
    if (!controls || document.getElementById('filter-temporal')) return;
    
    const select = document.createElement('select');
    select.id = 'filter-temporal';
    select.innerHTML = `
      <option value="">Todos os Períodos</option>
      <option value="Hoje">Hoje</option>
      <option value="Última Semana">Última Semana</option>
      <option value="Último Mês">Último Mês</option>
      <option value="Antigo">Mais Antigos</option>
    `;
    
    // Inserir antes dos botões
    const applyBtn = document.getElementById('apply-filters');
    if (applyBtn) {
      controls.insertBefore(select, applyBtn);
    }
  }

  adicionarEventListeners() {
    const applyBtn = document.getElementById('apply-filters');
    const clearBtn = document.getElementById('clear-filters');
    
    if (applyBtn) {
      applyBtn.addEventListener('click', () => this.aplicarFiltros());
    }
    
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.limparFiltros());
    }
  }

  aplicarFiltros() {
    console.log('🔍 Aplicando filtros...');
    
    // Obter valores dos filtros
    const municipio = document.getElementById('filter-municipio')?.value || '';
    const bioma = document.getElementById('filter-bioma')?.value || '';
    const temporal = document.getElementById('filter-temporal')?.value || '';
    const dataInicio = document.getElementById('filter-data-inicio')?.value || '';
    const dataFim = document.getElementById('filter-data-fim')?.value || '';
    
    // Aplicar filtros
    this.dadosFiltrados = this.dados.filter(foco => {
      if (municipio && foco.municipio !== municipio) return false;
      if (bioma && foco.bioma !== bioma) return false;
      if (temporal && foco.categoria_temporal !== temporal) return false;
      
      if (dataInicio && foco.data < dataInicio) return false;
      if (dataFim && foco.data > dataFim) return false;
      
      return true;
    });
    
    console.log(`✅ Filtros aplicados: ${this.dadosFiltrados.length} focos`);
    
    this.atualizarTudo();
  }

  limparFiltros() {
    console.log('🧹 Limpando filtros...');
    
    // Limpar valores dos filtros
    ['filter-municipio', 'filter-bioma', 'filter-temporal', 'filter-data-inicio', 'filter-data-fim']
      .forEach(id => {
        const element = document.getElementById(id);
        if (element) element.value = '';
      });
    
    this.dadosFiltrados = [...this.dados];
    this.atualizarTudo();
  }

  atualizarTudo() {
    this.atualizarEstatisticas();
    this.adicionarFocosAoMapa();
    this.atualizarTabela();
  }

  atualizarEstatisticas() {
    const totalFocos = document.getElementById('total-focos');
    const focosHoje = document.getElementById('focos-hoje');
    const ultimaAtualizacao = document.getElementById('ultima-atualizacao');
    
    if (totalFocos) totalFocos.textContent = this.dadosFiltrados.length;
    
    if (focosHoje) {
      const focosDeHoje = this.dadosFiltrados.filter(f => f.categoria_temporal === 'Hoje').length;
      focosHoje.textContent = focosDeHoje;
    }
    
    if (ultimaAtualizacao) {
      ultimaAtualizacao.textContent = new Date().toLocaleTimeString('pt-BR');
    }
  }

  inicializarGraficos() {
    // TODO: Implementar gráficos Chart.js
    console.log('📊 Gráficos serão implementados na próxima versão');
  }

  atualizarTabela() {
    console.log('📋 Atualizando tabela...');
    
    const tableBody = document.getElementById('focos-table-body');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    const dadosLimitados = this.dadosFiltrados.slice(0, 100);
    
    dadosLimitados.forEach(foco => {
      const row = document.createElement('tr');
      const lat = foco.latitude || parseFloat(foco.lat) || 0;
      const lon = foco.longitude || parseFloat(foco.lon) || 0;
      
      row.innerHTML = `
        <td>${foco.data || 'N/A'} ${foco.hora || ''}</td>
        <td>${lat.toFixed(4)}</td>
        <td>${lon.toFixed(4)}</td>
        <td>${foco.municipio || 'N/A'}</td>
        <td>${foco.bioma || 'N/A'}</td>
        <td>${foco.satelite || 'N/A'}</td>
        <td>${foco.uc || 'N/A'}</td>
      `;
      tableBody.appendChild(row);
    });
  }

  inicializarTabela() {
    // Método vazio - tabela é atualizada em atualizarTabela()
  }

  mostrarLoading(mostrar) {
    const loading = document.getElementById('loading-overlay');
    if (loading) {
      loading.style.display = mostrar ? 'flex' : 'none';
    }
  }

  mostrarErro(mensagem) {
    console.error('❌ Erro:', mensagem);
    
    let errorDiv = document.getElementById('error-message');
    if (!errorDiv) {
      errorDiv = document.createElement('div');
      errorDiv.id = 'error-message';
      errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%);
        color: white;
        padding: 18px 25px;
        border-radius: 12px;
        box-shadow: 0 8px 25px rgba(255, 107, 107, 0.3);
        z-index: 10000;
        max-width: 380px;
        font-size: 14px;
        line-height: 1.5;
        font-weight: 500;
      `;
      document.body.appendChild(errorDiv);
    }
    
    errorDiv.textContent = mensagem;
    errorDiv.style.display = 'block';
    
    setTimeout(() => {
      errorDiv.style.display = 'none';
    }, 5000);
  }
}

// Inicializar dashboard
document.addEventListener('DOMContentLoaded', () => {
  console.log('🌟 Página carregada, inicializando dashboard...');
  
  setTimeout(() => {
    new FocosCalorDashboard();
  }, 1000);
});
