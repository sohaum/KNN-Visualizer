const CONFIG = {
            CANVAS_WIDTH: 1000,
            CANVAS_HEIGHT: 500,
            POINT_RADIUS: 4,
            CENTROID_RADIUS: 8,
            COLORS: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff', '#5f27cd'],
            ANIMATION_SPEEDS: [2000, 1500, 1000, 750, 500]
        };

        // State
        const state = {
            dataPoints: [],
            centroids: [],
            k: 3,
            numPoints: 100,
            iteration: 0,
            isRunning: false,
            showVoronoi: false,
            animationSpeed: 1000,
            convergenceThreshold: 0.01,
            hasConverged: false
        };

        // DOM Elements
        const canvas = document.getElementById('kmeans-canvas');
        const kSlider = document.getElementById('k-slider');
        const kValue = document.getElementById('k-value');
        const pointsSlider = document.getElementById('points-slider');
        const pointsValue = document.getElementById('points-value');
        const speedSlider = document.getElementById('speed-slider');
        const speedValue = document.getElementById('speed-value');
        const generateBtn = document.getElementById('generate-btn');
        const initBtn = document.getElementById('init-btn');
        const stepBtn = document.getElementById('step-btn');
        const runBtn = document.getElementById('run-btn');
        const resetBtn = document.getElementById('reset-btn');
        const voronoiBtn = document.getElementById('voronoi-btn');
        const convergenceStatus = document.getElementById('convergence-status');
        const iterationCounter = document.getElementById('iteration-counter');
        const inertiaValue = document.getElementById('inertia-value');
        const silhouetteValue = document.getElementById('silhouette-value');

        // SVG namespace
        const SVG_NS = "http://www.w3.org/2000/svg";

        // Utility functions
        function createSVGElement(tag, attrs) {
            const element = document.createElementNS(SVG_NS, tag);
            Object.entries(attrs).forEach(([key, value]) => {
                element.setAttribute(key, value);
            });
            return element;
        }

        function distance(p1, p2) {
            return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
        }

        function generateRandomPoints() {
            state.dataPoints = [];
            for (let i = 0; i < state.numPoints; i++) {
                state.dataPoints.push({
                    x: Math.random() * (CONFIG.CANVAS_WIDTH - 100) + 50,
                    y: Math.random() * (CONFIG.CANVAS_HEIGHT - 100) + 50,
                    cluster: -1,
                    id: i
                });
            }
        }

        function generateClusteredData() {
            state.dataPoints = [];
            const numClusters = Math.min(state.k + 1, 4);
            const pointsPerCluster = Math.floor(state.numPoints / numClusters);
            
            for (let cluster = 0; cluster < numClusters; cluster++) {
                const centerX = (cluster + 1) * (CONFIG.CANVAS_WIDTH / (numClusters + 1));
                const centerY = CONFIG.CANVAS_HEIGHT / 2 + (Math.random() - 0.5) * 200;
                
                for (let i = 0; i < pointsPerCluster; i++) {
                    const angle = Math.random() * 2 * Math.PI;
                    const radius = Math.random() * 80 + 20;
                    
                    state.dataPoints.push({
                        x: centerX + Math.cos(angle) * radius,
                        y: centerY + Math.sin(angle) * radius,
                        cluster: -1,
                        id: state.dataPoints.length
                    });
                }
            }
            
            // Add remaining points randomly
            while (state.dataPoints.length < state.numPoints) {
                state.dataPoints.push({
                    x: Math.random() * (CONFIG.CANVAS_WIDTH - 100) + 50,
                    y: Math.random() * (CONFIG.CANVAS_HEIGHT - 100) + 50,
                    cluster: -1,
                    id: state.dataPoints.length
                });
            }
        }

        function initializeCentroids() {
            state.centroids = [];
            for (let i = 0; i < state.k; i++) {
                state.centroids.push({
                    x: Math.random() * (CONFIG.CANVAS_WIDTH - 100) + 50,
                    y: Math.random() * (CONFIG.CANVAS_HEIGHT - 100) + 50,
                    id: i,
                    prevX: 0,
                    prevY: 0
                });
            }
        }

        function assignClusters() {
            state.dataPoints.forEach(point => {
                let minDistance = Infinity;
                let closestCentroid = -1;
                
                state.centroids.forEach((centroid, index) => {
                    const dist = distance(point, centroid);
                    if (dist < minDistance) {
                        minDistance = dist;
                        closestCentroid = index;
                    }
                });
                
                point.cluster = closestCentroid;
            });
        }

        function updateCentroids() {
            let maxMovement = 0;
            
            state.centroids.forEach((centroid, index) => {
                const clusterPoints = state.dataPoints.filter(p => p.cluster === index);
                
                if (clusterPoints.length > 0) {
                    centroid.prevX = centroid.x;
                    centroid.prevY = centroid.y;
                    
                    centroid.x = clusterPoints.reduce((sum, p) => sum + p.x, 0) / clusterPoints.length;
                    centroid.y = clusterPoints.reduce((sum, p) => sum + p.y, 0) / clusterPoints.length;
                    
                    const movement = distance(centroid, { x: centroid.prevX, y: centroid.prevY });
                    maxMovement = Math.max(maxMovement, movement);
                }
            });
            
            return maxMovement;
        }

        function calculateInertia() {
            let inertia = 0;
            state.dataPoints.forEach(point => {
                if (point.cluster >= 0) {
                    const centroid = state.centroids[point.cluster];
                    inertia += Math.pow(distance(point, centroid), 2);
                }
            });
            return Math.round(inertia);
        }

        function calculateSilhouette() {
            // Simplified silhouette calculation
            let silhouette = 0;
            let validPoints = 0;
            
            state.dataPoints.forEach(point => {
                if (point.cluster >= 0) {
                    const sameCluster = state.dataPoints.filter(p => p.cluster === point.cluster && p.id !== point.id);
                    const otherClusters = state.dataPoints.filter(p => p.cluster !== point.cluster);
                    
                    if (sameCluster.length > 0 && otherClusters.length > 0) {
                        const a = sameCluster.reduce((sum, p) => sum + distance(point, p), 0) / sameCluster.length;
                        const b = Math.min(...Array.from(new Set(otherClusters.map(p => p.cluster))).map(cluster => {
                            const clusterPoints = otherClusters.filter(p => p.cluster === cluster);
                            return clusterPoints.reduce((sum, p) => sum + distance(point, p), 0) / clusterPoints.length;
                        }));
                        
                        silhouette += (b - a) / Math.max(a, b);
                        validPoints++;
                    }
                }
            });
            
            return validPoints > 0 ? (silhouette / validPoints).toFixed(3) : 0;
        }

        function generateVoronoiDiagram() {
            // Simple Voronoi approximation using sampling
            const voronoiCells = [];
            const step = 20;
            
            for (let i = 0; i < state.k; i++) {
                voronoiCells.push([]);
            }
            
            for (let x = 0; x < CONFIG.CANVAS_WIDTH; x += step) {
                for (let y = 0; y < CONFIG.CANVAS_HEIGHT; y += step) {
                    let closestCentroid = -1;
                    let minDistance = Infinity;
                    
                    state.centroids.forEach((centroid, index) => {
                        const dist = distance({ x, y }, centroid);
                        if (dist < minDistance) {
                            minDistance = dist;
                            closestCentroid = index;
                        }
                    });
                    
                    if (closestCentroid >= 0) {
                        voronoiCells[closestCentroid].push(`${x},${y}`);
                    }
                }
            }
            
            return voronoiCells;
        }

        function render() {
            canvas.innerHTML = '';
            
            // Set canvas viewBox
            canvas.setAttribute('viewBox', `0 0 ${CONFIG.CANVAS_WIDTH} ${CONFIG.CANVAS_HEIGHT}`);
            
            // Draw Voronoi diagram if enabled
            if (state.showVoronoi && state.centroids.length > 0) {
                const voronoiCells = generateVoronoiDiagram();
                voronoiCells.forEach((cell, index) => {
                    if (cell.length > 0) {
                        const polygon = createSVGElement('polygon', {
                            points: cell.join(' '),
                            fill: CONFIG.COLORS[index],
                            class: 'voronoi-cell'
                        });
                        canvas.appendChild(polygon);
                    }
                });
            }
            
            // Draw lines from points to centroids
            state.dataPoints.forEach(point => {
                if (point.cluster >= 0) {
                    const centroid = state.centroids[point.cluster];
                    const line = createSVGElement('line', {
                        x1: point.x,
                        y1: point.y,
                        x2: centroid.x,
                        y2: centroid.y,
                        stroke: CONFIG.COLORS[point.cluster],
                        class: 'cluster-line'
                    });
                    canvas.appendChild(line);
                }
            });
            
            // Draw data points
            state.dataPoints.forEach(point => {
                const color = point.cluster >= 0 ? CONFIG.COLORS[point.cluster] : '#666';
                const circle = createSVGElement('circle', {
                    cx: point.x,
                    cy: point.y,
                    r: CONFIG.POINT_RADIUS,
                    fill: color,
                    class: 'data-point',
                    'data-id': point.id
                });
                canvas.appendChild(circle);
            });
            
            // Draw centroids
            state.centroids.forEach((centroid, index) => {
                // Centroid shadow
                const shadow = createSVGElement('circle', {
                    cx: centroid.x + 2,
                    cy: centroid.y + 2,
                    r: CONFIG.CENTROID_RADIUS,
                    fill: 'rgba(0,0,0,0.3)'
                });
                canvas.appendChild(shadow);
                
                // Centroid
                const circle = createSVGElement('circle', {
                    cx: centroid.x,
                    cy: centroid.y,
                    r: CONFIG.CENTROID_RADIUS,
                    fill: CONFIG.COLORS[index],
                    stroke: 'white',
                    'stroke-width': 3,
                    class: 'centroid'
                });
                canvas.appendChild(circle);
                
                // Centroid label
                const text = createSVGElement('text', {
                    x: centroid.x,
                    y: centroid.y + 5,
                    'text-anchor': 'middle',
                    fill: 'white',
                    'font-size': '12px',
                    'font-weight': 'bold'
                });
                text.textContent = `C${index + 1}`;
                canvas.appendChild(text);
            });
            
            // Update statistics
            updateStatistics();
        }

        function updateStatistics() {
            inertiaValue.textContent = calculateInertia();
            silhouetteValue.textContent = calculateSilhouette();
            iterationCounter.textContent = `Iteration: ${state.iteration}`;
            
            if (state.hasConverged) {
                convergenceStatus.className = 'convergence-indicator converged';
                convergenceStatus.innerHTML = '<i class="fas fa-check-circle"></i><span>Converged</span>';
            } else if (state.isRunning) {
                convergenceStatus.className = 'convergence-indicator running';
                convergenceStatus.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Running...</span>';
            } else {
                convergenceStatus.className = 'convergence-indicator';
                convergenceStatus.innerHTML = '<i class="fas fa-circle"></i><span>Ready</span>';
            }
        }

        function step() {
            if (state.centroids.length === 0) {
                initializeCentroids();
                state.iteration = 0;
            }
            
            assignClusters();
            const movement = updateCentroids();
            state.iteration++;
            
            state.hasConverged = movement < state.convergenceThreshold;
            
            render();
            
            return !state.hasConverged;
        }

        async function runAlgorithm() {
            if (state.isRunning) {
                state.isRunning = false;
                runBtn.innerHTML = '<i class="fas fa-play mr-2"></i>Run';
                runBtn.classList.remove('active');
                return;
            }
            
            state.isRunning = true;
            runBtn.innerHTML = '<i class="fas fa-pause mr-2"></i>Stop';
            runBtn.classList.add('active');
            
            while (state.isRunning && !state.hasConverged) {
                const shouldContinue = step();
                if (!shouldContinue) break;
                
                await new Promise(resolve => setTimeout(resolve, state.animationSpeed));
            }
            
            state.isRunning = false;
            runBtn.innerHTML = '<i class="fas fa-play mr-2"></i>Run';
            runBtn.classList.remove('active');
            
            if (state.hasConverged) {
                runBtn.classList.add('success');
                setTimeout(() => runBtn.classList.remove('success'), 2000);
            }
        }

        function reset() {
            state.isRunning = false;
            state.hasConverged = false;
            state.iteration = 0;
            state.centroids = [];
            state.dataPoints.forEach(point => point.cluster = -1);
            
            runBtn.innerHTML = '<i class="fas fa-play mr-2"></i>Run';
            runBtn.classList.remove('active', 'success');
            
            render();
        }

        // Event Listeners
        kSlider.addEventListener('input', (e) => {
            state.k = parseInt(e.target.value);
            kValue.textContent = state.k;
            reset();
        });

        pointsSlider.addEventListener('input', (e) => {
            state.numPoints = parseInt(e.target.value);
            pointsValue.textContent = state.numPoints;
            generateClusteredData();
            reset();
        });

        speedSlider.addEventListener('input', (e) => {
            const speedIndex = parseInt(e.target.value) - 1;
            state.animationSpeed = CONFIG.ANIMATION_SPEEDS[speedIndex];
            const speedLabels = ['Very Slow', 'Slow', 'Medium', 'Fast', 'Very Fast'];
            speedValue.textContent = speedLabels[speedIndex];
        });

        generateBtn.addEventListener('click', () => {
            generateClusteredData();
            reset();
        });

        initBtn.addEventListener('click', () => {
            if (state.dataPoints.length === 0) {
                generateClusteredData();
            }
            initializeCentroids();
            state.iteration = 0;
            state.hasConverged = false;
            state.dataPoints.forEach(point => point.cluster = -1);
            render();
        });

        stepBtn.addEventListener('click', () => {
            if (!state.isRunning) {
                step();
            }
        });

        runBtn.addEventListener('click', runAlgorithm);

        resetBtn.addEventListener('click', reset);

        voronoiBtn.addEventListener('click', () => {
            state.showVoronoi = !state.showVoronoi;
            voronoiBtn.classList.toggle('active');
            render();
        });

        // Canvas interactions
        canvas.addEventListener('click', (e) => {
            if (state.isRunning) return;
            
            const rect = canvas.getBoundingClientRect();
            const scaleX = CONFIG.CANVAS_WIDTH / rect.width;
            const scaleY = CONFIG.CANVAS_HEIGHT / rect.height;
            
            const x = (e.clientX - rect.left) * scaleX;
            const y = (e.clientY - rect.top) * scaleY;
            
            // Add new data point
            state.dataPoints.push({
                x: x,
                y: y,
                cluster: -1,
                id: state.dataPoints.length
            });
            
            state.numPoints = state.dataPoints.length;
            pointsValue.textContent = state.numPoints;
            pointsSlider.value = state.numPoints;
            
            render();
        });

        // Drag functionality for centroids
        let draggedCentroid = null;

        canvas.addEventListener('mousedown', (e) => {
            if (state.isRunning) return;
            
            const rect = canvas.getBoundingClientRect();
            const scaleX = CONFIG.CANVAS_WIDTH / rect.width;
            const scaleY = CONFIG.CANVAS_HEIGHT / rect.height;
            
            const x = (e.clientX - rect.left) * scaleX;
            const y = (e.clientY - rect.top) * scaleY;
            
            // Check if clicking on a centroid
            state.centroids.forEach((centroid, index) => {
                const dist = distance({ x, y }, centroid);
                if (dist <= CONFIG.CENTROID_RADIUS + 5) {
                    draggedCentroid = index;
                    canvas.style.cursor = 'grabbing';
                    e.preventDefault();
                }
            });
        });

        canvas.addEventListener('mousemove', (e) => {
            if (draggedCentroid !== null) {
                const rect = canvas.getBoundingClientRect();
                const scaleX = CONFIG.CANVAS_WIDTH / rect.width;
                const scaleY = CONFIG.CANVAS_HEIGHT / rect.height;
                
                const x = (e.clientX - rect.left) * scaleX;
                const y = (e.clientY - rect.top) * scaleY;
                
                state.centroids[draggedCentroid].x = Math.max(CONFIG.CENTROID_RADIUS, Math.min(CONFIG.CANVAS_WIDTH - CONFIG.CENTROID_RADIUS, x));
                state.centroids[draggedCentroid].y = Math.max(CONFIG.CENTROID_RADIUS, Math.min(CONFIG.CANVAS_HEIGHT - CONFIG.CENTROID_RADIUS, y));
                
                assignClusters();
                render();
            } else {
                // Show cursor feedback
                const rect = canvas.getBoundingClientRect();
                const scaleX = CONFIG.CANVAS_WIDTH / rect.width;
                const scaleY = CONFIG.CANVAS_HEIGHT / rect.height;
                
                const x = (e.clientX - rect.left) * scaleX;
                const y = (e.clientY - rect.top) * scaleY;
                
                let overCentroid = false;
                state.centroids.forEach(centroid => {
                    if (distance({ x, y }, centroid) <= CONFIG.CENTROID_RADIUS + 5) {
                        overCentroid = true;
                    }
                });
                
                canvas.style.cursor = overCentroid ? 'grab' : 'crosshair';
            }
        });

        canvas.addEventListener('mouseup', () => {
            draggedCentroid = null;
            canvas.style.cursor = 'crosshair';
        });

        canvas.addEventListener('mouseleave', () => {
            draggedCentroid = null;
            canvas.style.cursor = 'crosshair';
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT') return;
            
            switch(e.key) {
                case ' ':
                    e.preventDefault();
                    if (state.isRunning) {
                        runAlgorithm();
                    } else {
                        step();
                    }
                    break;
                case 'r':
                    reset();
                    break;
                case 'g':
                    generateClusteredData();
                    reset();
                    break;
                case 'i':
                    initBtn.click();
                    break;
                case 'v':
                    voronoiBtn.click();
                    break;
            }
        });

        // Initialize the visualization
        function initialize() {
            canvas.setAttribute('viewBox', `0 0 ${CONFIG.CANVAS_WIDTH} ${CONFIG.CANVAS_HEIGHT}`);
            generateClusteredData();
            render();
            
            // Add tooltips
            const tooltip = document.createElement('div');
            tooltip.style.cssText = `
                position: absolute;
                background: rgba(0,0,0,0.8);
                color: white;
                padding: 8px;
                border-radius: 4px;
                font-size: 12px;
                pointer-events: none;
                z-index: 1000;
                display: none;
            `;
            document.body.appendChild(tooltip);
            
            canvas.addEventListener('mousemove', (e) => {
                const rect = canvas.getBoundingClientRect();
                const scaleX = CONFIG.CANVAS_WIDTH / rect.width;
                const scaleY = CONFIG.CANVAS_HEIGHT / rect.height;
                
                const x = (e.clientX - rect.left) * scaleX;
                const y = (e.clientY - rect.top) * scaleY;
                
                let showTooltip = false;
                
                // Check for centroid hover
                state.centroids.forEach((centroid, index) => {
                    if (distance({ x, y }, centroid) <= CONFIG.CENTROID_RADIUS + 5) {
                        tooltip.innerHTML = `
                            <strong>Centroid ${index + 1}</strong><br>
                            Position: (${Math.round(centroid.x)}, ${Math.round(centroid.y)})<br>
                            Cluster Size: ${state.dataPoints.filter(p => p.cluster === index).length}
                        `;
                        tooltip.style.left = e.pageX + 10 + 'px';
                        tooltip.style.top = e.pageY - 10 + 'px';
                        tooltip.style.display = 'block';
                        showTooltip = true;
                    }
                });
                
                if (!showTooltip) {
                    tooltip.style.display = 'none';
                }
            });
            
            canvas.addEventListener('mouseleave', () => {
                tooltip.style.display = 'none';
            });
        }

        // Performance optimization: throttle rendering
        let renderTimeout;
        function throttledRender() {
            if (renderTimeout) return;
            renderTimeout = setTimeout(() => {
                render();
                renderTimeout = null;
            }, 16); // ~60fps
        }

        // Start the application
        initialize();
        
        // Add some helpful hints
        const hints = [
            "💡 Click anywhere to add new data points",
            "🎯 Drag centroids to see how clusters change",
            "⚡ Use keyboard shortcuts: Space (step), R (reset), G (generate)",
            "📊 Toggle Voronoi diagram to see cluster boundaries",
            "🔄 Watch the inertia decrease as the algorithm converges"
        ];
        
        let hintIndex = 0;
        function showHint() {
            const hintElement = document.createElement('div');
            hintElement.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 12px 16px;
                border-radius: 8px;
                font-size: 14px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                z-index: 1000;
                max-width: 300px;
                animation: slideIn 0.3s ease-out;
            `;
            hintElement.innerHTML = hints[hintIndex];
            document.body.appendChild(hintElement);
            
            hintIndex = (hintIndex + 1) % hints.length;
            
            setTimeout(() => {
                hintElement.style.animation = 'slideOut 0.3s ease-in';
                setTimeout(() => {
                    document.body.removeChild(hintElement);
                    setTimeout(showHint, 2000); // Show next hint after 1s pause
                }, 300);
            }, 4000);
        }
        
        // Show first hint after a delay
        setTimeout(showHint, 2000);
        
        // Add CSS for hint animations
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);