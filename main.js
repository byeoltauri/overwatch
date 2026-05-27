// frameDuration: 한 프레임당 주어진 시간 (음악이 너무 빠르다 싶으면 수치 증가시킬것)
// slow N, fast N: 데이터 슬라이스 수, slowN은 정렬이 빠르니 진행속도를 느리게 하라 fastN는 정렬이 느리니 진행속도를 빠르게 하라
// slowInterval, fastInterval: 스왑까지 기다려주는 시간

// frameDuration: 33
// slow Interval: 12
// fast Interval: 6

// slow N: 128
// fast N: 64


// 외부 MP3 음원 로드를 위해 전역(window) 범위로 변환하여 선언
window.audioContext = null;
window.audioBuffer = null;
const AUDIO_URL = "./sort.mp3"; // mp3 파일명

// 브라우저 오디오 엔진 초기화 및 MP3 디코딩 함수
async function loadCustomAudio() {
    if (window.audioBuffer) return; 

    window.audioContext = new (window.AudioContext || window.webkitAudioContext)();

    try {
        const response = await fetch(AUDIO_URL);
        const arrayBuffer = await response.arrayBuffer();
        // window 객체에 정확하게 디코딩된 오디오 데이터 저장
        window.audioBuffer = await window.audioContext.decodeAudioData(arrayBuffer);
        console.log("MP3 음원 슬라이싱 준비 완료!");
    } catch (error) {
        console.error("오디오를 불러오는 중 에러 발생:", error);
    }
}

// canvas 크기 초기화 및 정렬 실행 메인 함수
async function execute(){
    const canvas = document.getElementById('canvas');

    // 정렬과 화면 구성을 시작하기 전에 오디오 파일부터 완전히 로드합니다.
    await loadCustomAudio();

    canvas.width = innerWidth;
    canvas.height = innerHeight;
    const ctx = canvas.getContext('2d');

    const img = 'https://i.imgur.com/Y31jrM1.jpeg';
    const image = new Image();
    image.src = "./test.png"; // 이미지 파일명

    const frameDuration = document.querySelector("#frameDuration").value * 1
    const slowInterval = document.querySelector("#slowInterval").value * 1
    const fastInterval = document.querySelector("#fastInterval").value * 1
    const slowN = document.querySelector("#slowN").value * 1
    const fastN = document.querySelector("#fastN").value * 1
    document.getElementById('presetForm').remove();

    for(let [isEfficient, sortGen,sortGenName] of [
        [true, mergeSort, "병합 정렬"],
        [false, selectionSort, "선택 정렬"],
        [false, insertionSort, "삽입 정렬"],
        [false, binaryInsertionSort, "이진 삽입 정렬"],
        [true, quickSort, "퀵 정렬"],
        [false, bubbleSort, "버블 정렬"],
        [false, cocktailShakerSort, "칵테일 쉐이커 정렬"],
        [false, gnomeSort, "놈 정렬"],
        [false, combSort, "콤 정렬"],
        [false, shellSort, "셸 정렬"],
        [true, heapSort, "힙 정렬"],
        [false, oddEvenSort, "홀짝 정렬"],
        [true, bitonicSort, "바이토닉 정렬"],
        [false, cycleSort, "사이클 정렬"],
        [false, lsdRadixSort, "LSD 기수 정렬"],
        [false, bogoSort, "보고 정렬"],
    ]){
        const n = isEfficient ? slowN : fastN;
        const interval = isEfficient ? slowInterval : fastInterval;
        //#canvas-label에 function 이름을 출력합니다.
        document.getElementById('canvas-label').innerText = `${sortGenName}(${sortGen.name})`;
        const arr = Array.from({ length: n }, (_, i) => i);

        const shuffledArray = await animateSort({
            image, ctx, arr: [...arr], interval:slowInterval, frameDuration, generator: shuffleGenerator,
        });
        await asleep(1000);
        const sortedArray = await animateSort({
            yieldCompare: true, image, ctx, arr: shuffledArray, interval, frameDuration, generator: sortGen,
        });
        const accentInterval = window.audioBuffer ? (window.audioBuffer.duration * 1000) / n : fastInterval;

    await animateSort({
        yieldCompare: true, 
        image, 
        ctx, 
        arr: sortedArray, 
        interval: accentInterval,      
        frameDuration: accentInterval, 
        generator: accentGenerator,
    });
        await asleep(2000);
    }

    console.log('done');
}


function rearrangeImage({ order, image, ctx, width = ctx.canvas.width, height = ctx.canvas.height, colored = [] }) {
    const canvas = ctx.canvas;

    canvas.width = width;
    canvas.height = height;

    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    const segmentCount = order.length;
    const segmentWidth = Math.floor(canvas.width / segmentCount);
    const remainder = canvas.width % segmentCount;

    let segments = [];

    let accumulatedWidth = 0;
    for (let i = 0; i < segmentCount; i++) {
        const currentSegmentWidth = i < remainder ? segmentWidth + 1 : segmentWidth;

        const segmentCanvas = document.createElement('canvas');
        segmentCanvas.width = currentSegmentWidth;
        segmentCanvas.height = canvas.height;
        const segmentCtx = segmentCanvas.getContext('2d');

        segmentCtx.drawImage(
            canvas,
            accumulatedWidth, 0, currentSegmentWidth, canvas.height, 
            0, 0, currentSegmentWidth, canvas.height 
        );

        segments.push(segmentCanvas);
        accumulatedWidth += currentSegmentWidth;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    accumulatedWidth = 0;
    for (let i = 0; i < segmentCount; i++) {
        const currentSegmentWidth = i < remainder ? segmentWidth + 1 : segmentWidth;
        const segmentIndex = order[i];
        const segment = segments[segmentIndex];
        ctx.drawImage(segment, accumulatedWidth, 0);
        accumulatedWidth += currentSegmentWidth;
    }

    for (const { indexes, color } of colored) {
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = color; 
        indexes.forEach(index => {
            const currentSegmentWidth = index < remainder ? segmentWidth + 1 : segmentWidth;
            const segmentXPosition = index * segmentWidth;
            ctx.fillRect(segmentXPosition, 0, currentSegmentWidth, canvas.height);
        });
        ctx.globalCompositeOperation = 'source-over';
    }
}


async function animateSort({ image, ctx, arr, interval, frameDuration, generator, yieldCompare }) {
    let finalArray = [...arr]; 
    let colorAndSoundQueue = [];
    const numStepsPerFrame = Math.ceil(frameDuration / interval);
    let i = 0;
    
    for (let result of generator(finalArray, yieldCompare)) {
        i++;
        if (i > 80000) break;
        const { array, swappedIndexes = [], compareIndexes = [], comparisons, swaps } = result;
        
        colorAndSoundQueue.push({
            array,
            colored: [
                { indexes: compareIndexes, color: 'rgba(255, 0, 0, 0.5)' },
                { indexes: swappedIndexes, color: 'rgba(0, 255, 0, 0.5)' },
            ],
            soundIndexes: compareIndexes.length === 0 ? swappedIndexes : compareIndexes
        });
        
        finalArray = array;
    }
    
    while (colorAndSoundQueue.length > 0) {
        let combinedArray;
        let combinedColored = [];
        let combinedSoundIndexes = new Set();

        for (let i = 0; i < numStepsPerFrame && colorAndSoundQueue.length > 0; i++) {
            let { array, colored, soundIndexes } = colorAndSoundQueue.shift();
            combinedArray = array;
            combinedColored.push(...colored);
            
            soundIndexes.forEach(index => combinedSoundIndexes.add(index));
        }
        
        rearrangeImage({ order: combinedArray, image, ctx, colored: combinedColored });
        playBeep({ duration: Math.max(frameDuration, interval), n: arr.length, indexes: Array.from(combinedSoundIndexes), type: 'square' });
        await asleep(Math.max(frameDuration, interval));
    }
    
    rearrangeImage({ order: finalArray, image, ctx });
    return finalArray;
}


function asleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


let currentSources = []; 

function playBeep({ duration, n, indexes, type = 'sine' }) {
    if (!window.audioContext || !window.audioBuffer) return;

    if (currentSources.length > 30) {
        const oldest = currentSources.shift();
        try { oldest.stop(); } catch(e) {}
    }

    indexes.forEach((i) => {
        const baseChunkSize = window.audioBuffer.duration / n;
        const startTimeInAudio = i * baseChunkSize;

        const playDuration = Math.max(baseChunkSize, (duration / 1000) * 1.8);

        const bufferSource = window.audioContext.createBufferSource();
        bufferSource.buffer = window.audioBuffer;

        const gainNode = window.audioContext.createGain();
        
        gainNode.gain.setValueAtTime(1.0, window.audioContext.currentTime); // 볼륨
        gainNode.gain.linearRampToValueAtTime(0.001, window.audioContext.currentTime + playDuration);

        bufferSource.connect(gainNode);
        gainNode.connect(window.audioContext.destination);

        bufferSource.start(0, startTimeInAudio, playDuration);
        
        currentSources.push(bufferSource);
    });
}