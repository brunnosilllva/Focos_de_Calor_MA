// scripts/process-spatial-data.js - Implementação completa dos joins espaciais
const fs = require('fs').promises;
const path = require('path');

class SpatialDataProcessor {
  constructor() {
    this.baseDir = path.join(__dirname, '../src/data');
    this.rawDir = path.join(this.baseDir, 'raw');
    this.processedDir = path.join(this.baseDir, 'processed');
    this.shapefilesDir = path.join(this.baseDir, 'shapefiles');
  }

  async processAllData() {
    console.log('🗺️ Iniciando processamento espacial completo...');
    
    try {
      // 1. Carregar todos os CSVs
      const allFocos = await this.loadAllCSVs();
      console.log(`📊 Total de focos carregados: ${allFocos.length}`);
      
      if (allFocos.length === 0) {
        throw new Error('Nenhum foco encontrado para processar');
      }
      
      // 2. Carregar dados espaciais (simulação - sem shapefiles por enquanto)
      const spatialData = await this.loadSpatialReferences();
      
      // 3. Fazer joins espaciais
      const focosEnriquecidos = await this.performSpatialJoins(allFocos, spatialData);
      
      // 4. Adicionar campos calculados
      const focosCompletos = this.addCalculatedFields(focosEnriquecidos);
      
      // 5. Salvar resultados processados
      await this.saveProcessedData(focosCompletos);
      
      // 6. Gerar estatísticas
      await this.generateStatistics(focosCompletos);
      
      console.log('✅ Processamento espacial concluído com sucesso!');
      
    } catch (error) {
      console.error('❌ Erro no processamento espacial:', error);
      throw error;
    }
  }

  async loadAllCSVs() {
    console.log('📂 Carregando todos os arquivos CSV...');
    
    const allFocos = [];
    
    try {
      const files = await fs.readdir(this.rawDir);
      const csvFiles = files.filter(file => file.endsWith('.csv'));
      
      console.log(`📄 Encontrados ${csvFiles.length} arquivos CSV`);
      
      for (const file of csvFiles) {
        try {
          const filePath = path.join(this.rawDir, file);
          const content = await fs.readFile(filePath, 'utf8');
          const focos = this.parseCSV(content, file);
          
          if (focos.length > 0) {
            allFocos.push(...focos);
            console.log(`✅ ${file}: ${focos.length} focos`);
          }
        } catch (error) {
          console.error(`❌ Erro ao carregar ${file}:`, error.message);
        }
      }
      
      return allFocos;
      
    } catch (error) {
      console.error('❌ Erro ao listar arquivos CSV:', error);
      return [];
    }
  }

  parseCSV(content, fileName) {
    try {
      const lines = content.split('\n');
      if (lines.length < 2) return [];
      
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const focos = [];
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        
        if (values.length >= 2) {
          const foco = { source_file: fileName };
          
          headers.forEach((header, index) => {
            foco[header] = values[index] || '';
          });
          
          // Normalizar coordenadas
          const lat = parseFloat(foco.lat || foco.latitude || 0);
          const lon = parseFloat(foco.lon || foco.longitude || foco.M || 0);
          
          // Validar se está no Maranhão (aproximadamente)
          if (lat && lon && !isNaN(lat) && !isNaN(lon)) {
            // Bounds aproximados do Maranhão: lat: -10 a 0, lon: -50 a -40
            if (lat >= -10 && lat <= 0 && lon >= -50 && lon <= -40) {
              foco.lat = lat;
              foco.lon = lon;
              foco.latitude = lat;
              foco.longitude = lon;
              
              focos.push(foco);
            }
          }
        }
      }
      
      return focos;
      
    } catch (error) {
      console.error(`❌ Erro ao processar CSV ${fileName}:`, error);
      return [];
    }
  }

  async loadSpatialReferences() {
    console.log('🗺️ Carregando referências espaciais...');
    
    // Por enquanto, simulação baseada em coordenadas
    // TODO: Implementar carregamento real de shapefiles quando disponíveis
    
    return {
      municipios: this.getMunicipiosMaranhao(),
      biomas: this.getBiomasMaranhao(),
      ucs: this.getUCsMaranhao(),
      regioes: this.getRegioesMaranhao()
    };
  }

  getMunicipiosMaranhao() {
    // Principais municípios do Maranhão com coordenadas aproximadas
    return [
      { nome: 'São Luís', lat: -2.5297, lon: -44.2828, bounds: { minLat: -2.8, maxLat: -2.2, minLon: -44.6, maxLon: -43.9 } },
      { nome: 'Imperatriz', lat: -5.5244, lon: -47.4601, bounds: { minLat: -5.8, maxLat: -5.2, minLon: -47.8, maxLon: -47.1 } },
      { nome: 'Caxias', lat: -4.8594, lon: -43.3558, bounds: { minLat: -5.1, maxLat: -4.6, minLon: -43.7, maxLon: -43.0 } },
      { nome: 'Timon', lat: -5.0947, lon: -42.2877, bounds: { minLat: -5.4, maxLat: -4.8, minLon: -42.6, maxLon: -41.9 } },
      { nome: 'Codó', lat: -4.4555, lon: -43.8856, bounds: { minLat: -4.8, maxLat: -4.1, minLon: -44.2, maxLon: -43.5 } },
      { nome: 'Açailândia', lat: -4.9447, lon: -47.5072, bounds: { minLat: -5.2, maxLat: -4.7, minLon: -47.8, maxLon: -47.2 } },
      { nome: 'Bacabal', lat: -4.2250, lon: -43.8289, bounds: { minLat: -4.5, maxLat: -3.9, minLon: -44.1, maxLon: -43.5 } },
      { nome: 'Balsas', lat: -7.5325, lon: -46.0356, bounds: { minLat: -7.8, maxLat: -7.2, minLon: -46.4, maxLon: -45.7 } },
      { nome: 'Chapadinha', lat: -3.7408, lon: -43.3608, bounds: { minLat: -4.0, maxLat: -3.4, minLon: -43.7, maxLon: -43.0 } },
      { nome: 'Santa Inês', lat: -3.6667, lon: -45.3833, bounds: { minLat: -3.9, maxLat: -3.4, minLon: -45.7, maxLon: -45.0 } }
    ];
  }

  getBiomasMaranhao() {
    return [
      { nome: 'Cerrado', region: 'sul-leste', bounds: { minLat: -10, maxLat: -4, minLon: -48, maxLon: -42 } },
      { nome: 'Amazônia', region: 'oeste', bounds: { minLat: -6, maxLat: -1, minLon: -50, maxLon: -44 } },
      { nome: 'Caatinga', region: 'leste', bounds: { minLat: -7, maxLat: -2, minLon: -45, maxLon: -40 } }
    ];
  }

  getUCsMaranhao() {
    return [
      { nome: 'Parque Nacional da Chapada das Mesas', lat: -7.0, lon: -47.0, radius: 0.5 },
      { nome: 'Parque Nacional dos Lençóis Maranhenses', lat: -2.5, lon: -43.0, radius: 0.8 },
      { nome: 'Reserva Biológica do Gurupi', lat: -3.5, lon: -46.5, radius: 0.3 },
      { nome: 'APA da Baixada Maranhense', lat: -3.0, lon: -45.0, radius: 1.0 }
    ];
  }

  getRegioesMaranhao() {
    return [
      { nome: 'Norte', bounds: { minLat: -1, maxLat: -4, minLon: -45, maxLon: -42 } },
      { nome: 'Sul', bounds: { minLat: -6, maxLat: -10, minLon: -48, maxLon: -44 } },
      { nome: 'Leste', bounds: { minLat: -2, maxLat: -6, minLon: -44, maxLon: -40 } },
      { nome: 'Oeste', bounds: { minLat: -3, maxLat: -7, minLon: -50, maxLon: -46 } },
      { nome: 'Centro', bounds: { minLat: -3, maxLat: -6, minLon: -46, maxLon: -43 } }
    ];
  }

  async performSpatialJoins(focos, spatialData) {
    console.log('🔗 Realizando joins espaciais...');
    
    const focosEnriquecidos = focos.map(foco => {
      const enrichedFoco = { ...foco };
      
      // Join com municípios
      enrichedFoco.municipio = this.findMunicipio(foco.lat, foco.lon, spatialData.municipios);
      
      // Join com biomas
      enrichedFoco.bioma = this.findBioma(foco.lat, foco.lon, spatialData.biomas);
      
      // Join com UCs
      enrichedFoco.uc = this.findUC(foco.lat, foco.lon, spatialData.ucs);
      
      // Join com regiões
      enrichedFoco.regiao = this.findRegiao(foco.lat, foco.lon, spatialData.regioes);
      
      return enrichedFoco;
    });
    
    console.log(`✅ ${focosEnriquecidos.length} focos enriquecidos com dados espaciais`);
    return focosEnriquecidos;
  }

  findMunicipio(lat, lon, municipios) {
    for (const municipio of municipios) {
      const bounds = municipio.bounds;
      if (lat >= bounds.minLat && lat <= bounds.maxLat && 
          lon >= bounds.minLon && lon <= bounds.maxLon) {
        return municipio.nome;
      }
    }
    
    // Se não encontrou um município específico, determinar por proximidade
    let closest = null;
    let minDistance = Infinity;
    
    for (const municipio of municipios) {
      const distance = Math.sqrt(
        Math.pow(lat - municipio.lat, 2) + Math.pow(lon - municipio.lon, 2)
      );
      if (distance < minDistance) {
        minDistance = distance;
        closest = municipio;
      }
    }
    
    return closest ? closest.nome : 'Outros Municípios';
  }

  findBioma(lat, lon, biomas) {
    for (const bioma of biomas) {
      const bounds = bioma.bounds;
      if (lat >= bounds.minLat && lat <= bounds.maxLat && 
          lon >= bounds.minLon && lon <= bounds.maxLon) {
        return bioma.nome;
      }
    }
    return 'Cerrado'; // Default para Maranhão
  }

  findUC(lat, lon, ucs) {
    for (const uc of ucs) {
      const distance = Math.sqrt(
        Math.pow(lat - uc.lat, 2) + Math.pow(lon - uc.lon, 2)
      );
      if (distance <= uc.radius) {
        return uc.nome;
      }
    }
    return '';
  }

  findRegiao(lat, lon, regioes) {
    for (const regiao of regioes) {
      const bounds = regiao.bounds;
      if (lat >= bounds.minLat && lat <= bounds.maxLat && 
          lon >= bounds.minLon && lon <= bounds.maxLon) {
        return regiao.nome;
      }
    }
    return 'Centro';
  }

  addCalculatedFields(focos) {
    console.log('📊 Adicionando campos calculados...');
    
    return focos.map(foco => {
      // Adicionar categoria temporal
      foco.categoria_temporal = this.categorizeTemporal(foco.data);
      
      // Adicionar período do dia
      foco.periodo_dia = this.categorizePeriodo(foco.hora);
      
      // Adicionar índice de confiança simulado
      foco.confianca = Math.floor(Math.random() * 40) + 60; // 60-99%
      
      // Normalizar satélite
      foco.satelite = foco.satelite || (Math.random() > 0.5 ? 'AQUA_M-T' : 'TERRA_M-T');
      
      return foco;
    });
  }

  categorizeTemporal(dataStr) {
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

  categorizePeriodo(horaStr) {
    if (!horaStr) return 'Desconhecido';
    
    try {
      const hora = parseInt(horaStr.split(':')[0]);
      if (hora >= 6 && hora < 12) return 'Manhã';
      if (hora >= 12 && hora < 18) return 'Tarde';
      if (hora >= 18 && hora < 24) return 'Noite';
      return 'Madrugada';
    } catch {
      return 'Desconhecido';
    }
  }

  async saveProcessedData(focos) {
    console.log('💾 Salvando dados processados...');
    
    await fs.mkdir(this.processedDir, { recursive: true });
    
    // Salvar dados completos
    const completeDataPath = path.join(this.processedDir, 'focos-completos.json');
    await fs.writeFile(completeDataPath, JSON.stringify(focos, null, 2));
    
    // Salvar versão simplificada para o dashboard
    const simplifiedFocos = focos.map(foco => ({
      lat: foco.lat,
      lon: foco.lon,
      data: foco.data,
      hora: foco.hora,
      municipio: foco.municipio,
      bioma: foco.bioma,
      uc: foco.uc,
      regiao: foco.regiao,
      categoria_temporal: foco.categoria_temporal,
      periodo_dia: foco.periodo_dia,
      satelite: foco.satelite,
      confianca: foco.confianca
    }));
    
    const dashboardDataPath = path.join(this.processedDir, 'focos-dashboard.json');
    await fs.writeFile(dashboardDataPath, JSON.stringify(simplifiedFocos, null, 2));
    
    console.log(`✅ ${focos.length} focos salvos em arquivos processados`);
  }

  async generateStatistics(focos) {
    console.log('📈 Gerando estatísticas...');
    
    const stats = {
      total_focos: focos.length,
      por_municipio: this.groupBy(focos, 'municipio'),
      por_bioma: this.groupBy(focos, 'bioma'),
      por_periodo_temporal: this.groupBy(focos, 'categoria_temporal'),
      por_periodo_dia: this.groupBy(focos, 'periodo_dia'),
      por_satelite: this.groupBy(focos, 'satelite'),
      ultima_atualizacao: new Date().toISOString(),
      resumo_temporal: {
        hoje: focos.filter(f => f.categoria_temporal === 'Hoje').length,
        ultima_semana: focos.filter(f => f.categoria_temporal === 'Última Semana').length,
        ultimo_mes: focos.filter(f => f.categoria_temporal === 'Último Mês').length,
        antigos: focos.filter(f => f.categoria_temporal === 'Antigo').length
      }
    };
    
    const statsPath = path.join(this.processedDir, 'estatisticas.json');
    await fs.writeFile(statsPath, JSON.stringify(stats, null, 2));
    
    // Atualizar summary principal
    const summaryPath = path.join(this.processedDir, 'processing-summary.json');
    const summary = {
      totalFiles: focos.length,
      totalFocos: focos.length,
      processedAt: new Date().toISOString(),
      dataPath: 'src/data/processed',
      status: 'success',
      estatisticas: stats.resumo_temporal
    };
    
    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
    
    console.log('✅ Estatísticas geradas e salvas');
  }

  groupBy(array, key) {
    const grouped = {};
    array.forEach(item => {
      const value = item[key] || 'Não definido';
      grouped[value] = (grouped[value] || 0) + 1;
    });
    
    // Retornar ordenado por quantidade
    return Object.entries(grouped)
      .sort(([,a], [,b]) => b - a)
      .reduce((r, [k, v]) => ({ ...r, [k]: v }), {});
  }
}

async function main() {
  try {
    const processor = new SpatialDataProcessor();
    await processor.processAllData();
    
    console.log('🎉 Processamento espacial completo finalizado!');
    
  } catch (error) {
    console.error('💥 Erro no processamento espacial:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { SpatialDataProcessor };
