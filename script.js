document.addEventListener('DOMContentLoaded', () => {

    // --- DOM ELEMENT REFERENCES ---
    const numTransformationsInput = document.getElementById('num-transformations');
    const transformationsContainer = document.getElementById('transformation-inputs-container');
    const orderButtonsContainer = document.getElementById('transformation-order-buttons');
    const startBtn = document.getElementById('start-btn');
    const resetOrderBtn = document.getElementById('reset-order-btn'); // New button
    const fullResetBtn = document.getElementById('full-reset-btn'); // Renamed button
    const vectorXInput = document.getElementById('vector-x');
    const vectorYInput = document.getElementById('vector-y');
    const infoPanel = document.getElementById('info-panel');
    const canvasContainer = document.getElementById('canvas-container');

    // --- APP STATE ---
    let transformationOrder = [];
    let p5Instance;
    
    // --- VECTOR DATA ---
    let vectors = {
        main: { x: 2, y: 1, color: [52, 152, 219] },
        iHat: { x: 1, y: 0, color: [231, 76, 60] },
        jHat: { x: 0, y: 1, color: [46, 204, 113] }
    };

    // --- INITIALIZATION ---
    generateTransformationUI();
    
    // --- P5.JS SKETCH ---
    const sketch = (p) => {
        let gridScale = 30;
        let originX, originY;

        p.setup = () => {
            const containerSize = canvasContainer.getBoundingClientRect();
            let canvas = p.createCanvas(containerSize.width, containerSize.height);
            canvas.parent('canvas-container');
            originX = p.width / 2;
            originY = p.height / 2;
            updateVectorFromInputs();
            p.noLoop();
            p.redraw();
        };

        p.draw = () => {
            p.background(255);
            drawStaticGrid();      // NEW: Draw the non-moving background grid
            drawTransformedGrid(); // Draw the moving grid representing the span
            drawAxes();
            drawVectors();
        };
        
        // NEW: Draws the static, original grid that never changes.
        function drawStaticGrid() {
            p.stroke(240); // Very light grey
            p.strokeWeight(1);
            const numLines = 50;
            // Vertical lines
            for (let i = -numLines; i <= numLines; i++) {
                p.line(originX + i * gridScale, 0, originX + i * gridScale, p.height);
            }
            // Horizontal lines
            for (let i = -numLines; i <= numLines; i++) {
                p.line(0, originY + i * gridScale, p.width, originY + i * gridScale);
            }
        }

        function drawTransformedGrid() {
            const numLines = 20;
            p.stroke(200, 200, 255); // Light blue for the transformed span
            p.strokeWeight(1);

            for (let i = -numLines; i <= numLines; i++) {
                if (i === 0) continue;
                const startX = originX + (i * vectors.iHat.x - numLines * vectors.jHat.x) * gridScale;
                const startY = originY - (i * vectors.iHat.y - numLines * vectors.jHat.y) * gridScale;
                const endX = originX + (i * vectors.iHat.x + numLines * vectors.jHat.x) * gridScale;
                const endY = originY - (i * vectors.iHat.y + numLines * vectors.jHat.y) * gridScale;
                p.line(startX, startY, endX, endY);
            }

            for (let j = -numLines; j <= numLines; j++) {
                if (j === 0) continue;
                const startX = originX + (-numLines * vectors.iHat.x + j * vectors.jHat.x) * gridScale;
                const startY = originY - (-numLines * vectors.iHat.y + j * vectors.jHat.y) * gridScale;
                const endX = originX + (numLines * vectors.iHat.x + j * vectors.jHat.x) * gridScale;
                const endY = originY - (numLines * vectors.iHat.y + j * vectors.jHat.y) * gridScale;
                p.line(startX, startY, endX, endY);
            }
        }
        
        function drawAxes() {
            p.stroke(0);
            p.strokeWeight(2);
            const numLines = 50;
            let startX = originX + (-numLines * vectors.iHat.x) * gridScale;
            let startY = originY - (-numLines * vectors.iHat.y) * gridScale;
            let endX = originX + (numLines * vectors.iHat.x) * gridScale;
            let endY = originY - (numLines * vectors.iHat.y) * gridScale;
            p.line(startX, startY, endX, endY);
            
            startX = originX + (-numLines * vectors.jHat.x) * gridScale;
            startY = originY - (-numLines * vectors.jHat.y) * gridScale;
            endX = originX + (numLines * vectors.jHat.x) * gridScale;
            endY = originY - (numLines * vectors.jHat.y) * gridScale;
            p.line(startX, startY, endX, endY);
        }
        
        function drawVectors() {
            drawArrow(vectors.iHat.x, vectors.iHat.y, vectors.iHat.color);
            drawArrow(vectors.jHat.x, vectors.jHat.y, vectors.jHat.color);
            drawArrow(vectors.main.x, vectors.main.y, vectors.main.color);
        }

        function drawArrow(x, y, color) {
            const screenX = originX + x * gridScale;
            const screenY = originY - y * gridScale;
            p.push();
            p.stroke(color); p.fill(color); p.strokeWeight(3);
            p.line(originX, originY, screenX, screenY);
            let angle = p.atan2(originY - screenY, screenX - originX);
            p.translate(screenX, screenY); p.rotate(angle);
            p.triangle(0, 0, -10, 5, -10, -5);
            p.pop();
        }
        
        p.updateAndRedraw = () => p.redraw();
        p.resetVectors = () => {
            updateVectorFromInputs();
            vectors.iHat = { x: 1, y: 0, color: [231, 76, 60] };
            vectors.jHat = { x: 0, y: 1, color: [46, 204, 113] };
            p.redraw();
        };
    };
    p5Instance = new p5(sketch);

    // --- UI EVENT LISTENERS ---
    numTransformationsInput.addEventListener('change', generateTransformationUI);
    fullResetBtn.addEventListener('click', fullReset);
    resetOrderBtn.addEventListener('click', resetOrder);

    orderButtonsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('order-btn') && !e.target.classList.contains('selected')) {
            const transformationName = e.target.dataset.name;
            transformationOrder.push(transformationName);
            e.target.classList.add('selected');
            e.target.dataset.order = transformationOrder.length;
        }
    });
    
    startBtn.addEventListener('click', async () => {
        if (transformationOrder.length === 0) {
            updateInfoPanel("Please select the order of transformations before starting.");
            return;
        }

        setButtonsDisabled(true);
        p5Instance.resetVectors();
        updateInfoPanel("Starting transformation sequence...");

        for (let i = 0; i < transformationOrder.length; i++) {
            const name = transformationOrder[i];
            const { iHat, jHat } = getMatrixValues(name);
            const matrix = math.matrix([[iHat.x, jHat.x], [iHat.y, jHat.y]]);

            const newMainVec = math.multiply(matrix, [vectors.main.x, vectors.main.y])._data;
            const newIHatVec = math.multiply(matrix, [vectors.iHat.x, vectors.iHat.y])._data;
            const newJHatVec = math.multiply(matrix, [vectors.jHat.x, vectors.jHat.y])._data;
            
            updateInfoPanel(`Applying Transformation ${name}... Animating for 5 seconds.`);

            await new Promise(resolve => {
                gsap.to(vectors.main, { x: newMainVec[0], y: newMainVec[1], duration: 5 });
                gsap.to(vectors.iHat, { x: newIHatVec[0], y: newIHatVec[1], duration: 5 });
                gsap.to(vectors.jHat, { 
                    x: newJHatVec[0], y: newJHatVec[1], duration: 5,
                    onUpdate: () => p5Instance.updateAndRedraw(),
                    onComplete: resolve
                });
            });

            const resultText = `After Transformation ${name}:<br>
                i-hat: [${vectors.iHat.x.toFixed(2)}, ${vectors.iHat.y.toFixed(2)}]<br>
                j-hat: [${vectors.jHat.x.toFixed(2)}, ${vectors.jHat.y.toFixed(2)}]<br>
                Vector: [${vectors.main.x.toFixed(2)}, ${vectors.main.y.toFixed(2)}]`;
            updateInfoPanel(resultText);

            if (i < transformationOrder.length - 1) {
                updateInfoPanel(resultText + "<br><br>Pausing for 5 seconds...", true);
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
        
        updateInfoPanel(infoPanel.innerHTML + "<br><br>Sequence complete. You can reset the order or perform a full reset.", true);
        setButtonsDisabled(false);
        // Keep order buttons disabled until reset
        orderButtonsContainer.querySelectorAll('.order-btn').forEach(btn => btn.disabled = true);
    });

    // --- HELPER FUNCTIONS ---

    function generateTransformationUI() {
        const count = numTransformationsInput.value;
        transformationsContainer.innerHTML = '';
        orderButtonsContainer.innerHTML = '';

        for (let i = 0; i < count; i++) {
            const name = String.fromCharCode(65 + i);
            const defDiv = document.createElement('div');
            defDiv.className = 'transformation-def';
            defDiv.innerHTML = `<h4>Transformation ${name}</h4>...`; // Content is the same
            transformationsContainer.appendChild(defDiv);

            const orderBtn = document.createElement('button');
            orderBtn.className = 'order-btn';
            orderBtn.textContent = name;
            orderBtn.dataset.name = name;
            orderButtonsContainer.appendChild(orderBtn);
        }
        // Need to re-fill the innerHTML of defDiv as it was truncated for brevity
        transformationsContainer.querySelectorAll('.transformation-def').forEach((div, i) => {
            const name = String.fromCharCode(65 + i);
            div.innerHTML = `
                <h4>Transformation ${name}</h4>
                <div class="control-group">
                    <label>i-hat lands at (x, y)</label>
                    <div class="vector-inputs">
                        <input type="number" id="i-hat-x-${name}" value="1">
                        <input type="number" id="i-hat-y-${name}" value="0">
                    </div>
                </div>
                <div class="control-group">
                    <label>j-hat lands at (x, y)</label>
                    <div class="vector-inputs">
                        <input type="number" id="j-hat-x-${name}" value="0">
                        <input type="number" id="j-hat-y-${name}" value="1">
                    </div>
                </div>
            `;
        });
    }
    
    function resetOrder() {
        transformationOrder = [];
        const orderButtons = orderButtonsContainer.querySelectorAll('.order-btn');
        orderButtons.forEach(btn => {
            btn.classList.remove('selected');
            btn.removeAttribute('data-order');
            btn.disabled = false;
        });
        
        p5Instance.resetVectors();
        updateInfoPanel("Order reset. Define a new transformation sequence by clicking the lettered buttons.");
        setButtonsDisabled(false);
    }
    
    function fullReset() {
        numTransformationsInput.value = 1;
        vectorXInput.value = 2;
        vectorYInput.value = 1;
        
        generateTransformationUI();
        resetOrder(); // This handles resetting buttons, order array, and canvas
        updateInfoPanel("Welcome! Set up your transformations and click 'Start'.");
    }

    function getMatrixValues(name) {
        const iHatX = parseFloat(document.getElementById(`i-hat-x-${name}`).value);
        const iHatY = parseFloat(document.getElementById(`i-hat-y-${name}`).value);
        const jHatX = parseFloat(document.getElementById(`j-hat-x-${name}`).value);
        const jHatY = parseFloat(document.getElementById(`j-hat-y-${name}`).value);
        return { iHat: { x: iHatX, y: iHatY }, jHat: { x: jHatX, y: jHatY } };
    }
    
    function updateVectorFromInputs() {
        vectors.main.x = parseFloat(vectorXInput.value);
        vectors.main.y = parseFloat(vectorYInput.value);
    }
    
    function updateInfoPanel(htmlContent, append = false) {
        infoPanel.innerHTML = append ? infoPanel.innerHTML + htmlContent : htmlContent;
    }

    function setButtonsDisabled(isDisabled) {
        startBtn.disabled = isDisabled;
        resetOrderBtn.disabled = isDisabled;
        fullResetBtn.disabled = isDisabled;
        orderButtonsContainer.querySelectorAll('.order-btn').forEach(btn => btn.disabled = isDisabled);
    }
});