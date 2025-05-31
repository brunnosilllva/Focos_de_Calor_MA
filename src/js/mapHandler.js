// mapHandler.js - Gerenciador de Mapas para Dashboard de Focos de Calor
class MapHandler {
    constructor() {
        this.mapa = null;
        this.layerFocos = null;
        this.layerMunicipios = null;
        this.layerBiomas = null;
        this.markers = [];
        this.clusters = null;
        
        // Configurações do mapa para Brasil completo
        this.config = {
            centro: [-14.2, -51.9], // Centro do Brasil
            zoom: 4,
            maxZoom: 18,
            minZoom: 3
        };
        
        // Estilos para diferentes tipos de focos
        this.estilos = {
            foco: {
                baixaConfianca: { color: '#fbbf24', fillColor: '#fde047', radius: 4 },
                mediaConfianca: { color: '#f97316', fillColor: '#fb923c', radius: 5 },
                altaConfianca: { color: '#dc2626', fillColor: '#f87171', radius: 6 }
            },
            biomas: {
                'Cerrado': '#f97316',
                'Amazônia': '#22c55e',
                'Caatinga': '#a3a3a3'
            }
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // 🗺️ INICIALIZAÇÃO DO MAPA
    // ═══════════════════════════════════════════════════════════════
    async inicializar(containerId) {
        try {
            // Verificar se Leaflet está disponível
            if (typeof L === 'undefined') {
                throw new Error('Leaflet não foi carregado');
            }

            // Verificar se container existe
            const container = document.getElementById(containerId);
            if (!container) {
                throw new Error(`Container ${containerId} não encontrado`);
            }

            // Inicializar mapa
            this.mapa = L.map(containerId, {
                center: this.config.centro,
                zoom: this.config.zoom,
                maxZoom: this.config.maxZoom,
                minZoom: this.config.minZoom,
                zoomControl: true,
                attributionControl: true
            });

            // Adicionar camadas base
            await this.adicionarCamadasBase();
            
            // Inicializar clusters para performance
            this.inicializarClusters();
            
            // Adicionar controles
            this.adicionarControles();
            
            console.log('🗺️ Mapa inicializado com sucesso');
            return true;
            
        } catch (error) {
            console.error('❌ Erro ao inicializar mapa:', error);
            throw error;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // 🌍 CAMADAS BASE
    // ═══════════════════════════════════════════════════════════════
    async adicionarCamadasBase() {
        // Camada OpenStreetMap padrão
        const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        });

        // Camada de satélite (Esri)
        const sateliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: '© Esri © DigitalGlobe © GeoEye © Earthstar Geographics',
            maxZoom: 19
        });

        // Camada topográfica
        const topoLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenTopoMap (CC-BY-SA)',
            maxZoom: 17
        });

        // Adicionar camada padrão
        osmLayer.addTo(this.mapa);

        // Controle de camadas
        const baseLayers = {
            "Mapa": osmLayer,
            "Satélite": sateliteLayer,
            "Topográfico": topoLayer
        };

        L.control.layers(baseLayers).addTo(this.mapa);
    }

    // ═══════════════════════════════════════════════════════════════
    // 🔥 GERENCIAMENTO DE FOCOS
    // ═══════════════════════════════════════════════════════════════
    adicionarFocos(focos) {
        try {
            // Limpar focos existentes
            this.limparFocos();
            
            if (!focos || focos.length === 0) {
                console.log('ℹ️ Nenhum foco para exibir');
                return;
            }

            // Criar markers para cada foco
            focos.forEach(foco => {
                const marker = this.criarMarkerFoco(foco);
                if (marker) {
                    this.clusters.addLayer(marker);
                    this.markers.push(marker);
                }
            });

            // Ajustar visualização se necessário
            if (focos.length > 0) {
                this.ajustarVisualizacao(focos);
            }

            console.log(`🔥 ${focos.length} focos adicionados ao mapa`);
            
        } catch (error) {
            console.error('❌ Erro ao adicionar focos:', error);
        }
    }

    criarMarkerFoco(foco) {
        try {
            // Validar coordenadas
            const lat = parseFloat(foco.latitude || foco.lat);
            const lng = parseFloat(foco.longitude || foco.lng || foco.lon);
            
            if (isNaN(lat) || isNaN(lng)) {
                console.warn('⚠️ Coordenadas inválidas:', foco);
                return null;
            }

            // Determinar estilo baseado na confiança
            const confianca = parseInt(foco.confianca || foco.confidence || 50);
            let estilo;
            
            if (confianca >= 80) {
                estilo = this.estilos.foco.altaConfianca;
            } else if (confianca >= 50) {
                estilo = this.estilos.foco.mediaConfianca;
            } else {
                estilo = this.estilos.foco.baixaConfianca;
            }

            // Criar marker
            const marker = L.circleMarker([lat, lng], {
                ...estilo,
                fillOpacity: 0.7,
                weight: 2
            });

            // Adicionar popup com informações
            const popupContent = this.criarPopupFoco(foco);
            marker.bindPopup(popupContent);

            // Adicionar tooltip
            const tooltipContent = `${foco.municipio || 'Município não identificado'} - ${confianca}%`;
            marker.bindTooltip(tooltipContent);

            return marker;
            
        } catch (error) {
            console.error('❌ Erro ao criar marker:', error);
            return null;
        }
    }

    criarPopupFoco(foco) {
        const data = foco.data_hora || foco.data || 'Data não disponível';
        const dataFormatada = new Date(data).toLocaleString('pt-BR');
        
        return `
            <div class="popup-foco">
                <h4>🔥 Foco de Calor</h4>
                <p><strong>Município:</strong> ${foco.municipio || 'N/A'}</p>
                <p><strong>Bioma:</strong> ${foco.bioma || 'N/A'}</p>
                <p><strong>Satélite:</strong> ${foco.satelite || 'N/A'}</p>
                <p><strong>Confiança:</strong> ${foco.confianca || foco.confidence || 'N/A'}%</p>
                <p><strong>Data/Hora:</strong> ${dataFormatada}</p>
                <p><strong>Coordenadas:</strong> ${foco.latitude}, ${foco.longitude}</p>
            </div>
        `;
    }

    // ═══════════════════════════════════════════════════════════════
    // 🔄 ATUALIZAÇÃO DE DADOS
    // ═══════════════════════════════════════════════════════════════
    atualizarFocos(novosFocos) {
        this.adicionarFocos(novosFocos);
    }

    limparFocos() {
        if (this.clusters) {
            this.clusters.clearLayers();
        }
        this.markers = [];
    }

    // ═══════════════════════════════════════════════════════════════
    // 🎯 CLUSTERS E PERFORMANCE
    // ═══════════════════════════════════════════════════════════════
    inicializarClusters() {
        // Verificar se MarkerClusterGroup está disponível
        if (typeof L.markerClusterGroup !== 'undefined') {
            this.clusters = L.markerClusterGroup({
                maxClusterRadius: 50,
                iconCreateFunction: (cluster) => {
                    const count = cluster.getChildCount();
                    let className = 'cluster-small';
                    
                    if (count > 100) className = 'cluster-large';
                    else if (count > 10) className = 'cluster-medium';
                    
                    return L.divIcon({
                        html: `<div><span>${count}</span></div>`,
                        className: `marker-cluster ${className}`,
                        iconSize: L.point(40, 40)
                    });
                }
            });
            
            this.mapa.addLayer(this.clusters);
        } else {
            // Fallback sem clusters
            console.warn('⚠️ MarkerClusterGroup não disponível, usando layer simples');
            this.clusters = L.layerGroup().addTo(this.mapa);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // 🎛️ CONTROLES E NAVEGAÇÃO
    // ═══════════════════════════════════════════════════════════════
    adicionarControles() {
        // Controle de escala
        L.control.scale({
            position: 'bottomleft',
            metric: true,
            imperial: false
        }).addTo(this.mapa);

        // Botão de localização (se disponível)
        if (navigator.geolocation) {
            const btnLocalizacao = L.control({position: 'topleft'});
            btnLocalizacao.onAdd = () => {
                const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
                div.innerHTML = '📍';
                div.style.backgroundColor = 'white';
                div.style.width = '30px';
                div.style.height = '30px';
                div.style.cursor = 'pointer';
                div.style.textAlign = 'center';
                div.style.lineHeight = '30px';
                div.title = 'Ir para minha localização';
                
                div.onclick = () => this.irParaLocalizacao();
                return div;
            };
            btnLocalizacao.addTo(this.mapa);
        }

        // Controle de informações
        this.adicionarControleLegenda();
    }

    adicionarControleLegenda() {
        const legenda = L.control({position: 'bottomright'});
        
        legenda.onAdd = () => {
            const div = L.DomUtil.create('div', 'info legenda');
            div.innerHTML = `
                <h4>🔥 Focos de Calor</h4>
                <div class="legenda-item">
                    <span class="legenda-cor" style="background: #f87171; border: 2px solid #dc2626;"></span>
                    Alta Confiança (≥80%)
                </div>
                <div class="legenda-item">
                    <span class="legenda-cor" style="background: #fb923c; border: 2px solid #f97316;"></span>
                    Média Confiança (50-79%)
                </div>
                <div class="legenda-item">
                    <span class="legenda-cor" style="background: #fde047; border: 2px solid #fbbf24;"></span>
                    Baixa Confiança (&lt;50%)
                </div>
            `;
            return div;
        };
        
        legenda.addTo(this.mapa);
    }

    // ═══════════════════════════════════════════════════════════════
    // 🌐 NAVEGAÇÃO E UTILIDADES
    // ═══════════════════════════════════════════════════════════════
    ajustarVisualizacao(focos) {
        if (!focos || focos.length === 0) return;

        try {
            // Calcular bounds dos focos
            const lats = focos.map(f => parseFloat(f.latitude)).filter(lat => !isNaN(lat));
            const lngs = focos.map(f => parseFloat(f.longitude)).filter(lng => !isNaN(lng));
            
            if (lats.length === 0 || lngs.length === 0) return;

            const bounds = L.latLngBounds([
                [Math.min(...lats), Math.min(...lngs)],
                [Math.max(...lats), Math.max(...lngs)]
            ]);

            // Ajustar visualização com padding
            this.mapa.fitBounds(bounds, {
                padding: [20, 20]
            });
            
        } catch (error) {
            console.error('❌ Erro ao ajustar visualização:', error);
        }
    }

    irParaLocalizacao() {
        if (!navigator.geolocation) {
            alert('Geolocalização não suportada pelo navegador');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                
                this.mapa.setView([lat, lng], 12);
                
                // Adicionar marker temporário
                const marker = L.marker([lat, lng])
                    .addTo(this.mapa)
                    .bindPopup('📍 Sua localização')
                    .openPopup();
                
                // Remover marker após 5 segundos
                setTimeout(() => {
                    this.mapa.removeLayer(marker);
                }, 5000);
            },
            (error) => {
                console.error('Erro ao obter localização:', error);
                alert('Não foi possível obter sua localização');
            }
        );
    }

    voltarParaBrasil() {
        this.mapa.setView(this.config.centro, this.config.zoom);
    }

    // ═══════════════════════════════════════════════════════════════
    // 🔧 MÉTODOS AUXILIARES
    // ═══════════════════════════════════════════════════════════════
    redimensionar() {
        if (this.mapa) {
            this.mapa.invalidateSize();
        }
    }

    obterBounds() {
        return this.mapa ? this.mapa.getBounds() : null;
    }

    obterZoom() {
        return this.mapa ? this.mapa.getZoom() : null;
    }

    obterCentro() {
        return this.mapa ? this.mapa.getCenter() : null;
    }

    destruir() {
        if (this.mapa) {
            this.mapa.remove();
            this.mapa = null;
        }
        this.markers = [];
        this.clusters = null;
    }

    // ═══════════════════════════════════════════════════════════════
    // 📊 ESTATÍSTICAS DO MAPA
    // ═══════════════════════════════════════════════════════════════
    obterEstatisticasVisuais() {
        return {
            totalMarkers: this.markers.length,
            zoom: this.obterZoom(),
            centro: this.obterCentro(),
            bounds: this.obterBounds()
        };
    }
}

// Exportar para uso global
window.MapHandler = MapHandler;
