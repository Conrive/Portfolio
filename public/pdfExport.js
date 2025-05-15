//Скрипт для генерации PDF документа через библиотеку PDFMake.
//Генерирует PDF на основе разметки страницы макета проекта.
//Ввиду ограничений библиотеки, не может в точности передать все настройки элементов

async function exportCanvasToPDF() {
    const canvas = document.getElementById('canvas');
    const elements = Array.from(canvas.children);
    const canvasStyles = getComputedStyle(canvas);

    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;

    const content = [];
    const [r, g, b] = parseRGB(canvasStyles.backgroundColor);

    content.push({ //Создает прямоугольник под параметры canvas
        canvas: [{
            type: 'rect',
            x: 0,
            y: 0,
            w: width,
            h: height,
            color: rgbToHex(r, g, b),
        }],
        absolutePosition: { x: 0, y: 0 }
    });

    if (canvasStyles.backgroundImage !== 'none') { //Ставит фоновое изображение странице, если токовое присутствует
        const match = canvasStyles.backgroundImage.match(/url\("?(.+?)"?\)/);
        if (match && match[1]) {
            const imgUrl = match[1];
            const imageData = await toDataURL(imgUrl);

            content.push({
                image: imageData,
                width: canvas.offsetWidth,
                height: canvas.offsetHeight,
                absolutePosition: { x: 0, y: 0 }
            });
        }
    }

    for (const el of elements) { //Перебор и добавление всех элементов на canvas
        const styles = getComputedStyle(el);
        const left = parseFloat(styles.left);
        const top = parseFloat(styles.top);
        const width = parseFloat(styles.width);
        const height = parseFloat(styles.height);
        const fontSize = parseFloat(styles.fontSize);
        const [r, g, b] = parseRGB(styles.color);

        if (el.tagName.toLowerCase() === 'div') {
            content.push({
                text: el.textContent,
                fontSize,
                color: rgbToHex(r, g, b),
                absolutePosition: { x: left, y: top }
            });

        } else if (el.tagName.toLowerCase() === 'a') {
            content.push({
                text: el.textContent,
                fontSize,
                color: rgbToHex(r, g, b),
                decoration: styles.textDecoration.includes('underline') ? 'underline' : undefined,
                link: el.href || undefined,
                absolutePosition: { x: left, y: top }
            });

        } else if (el.tagName.toLowerCase() === 'img') {
            const imgData = await toDataURL(el.src);
            content.push({
                image: imgData,
                width,
                height,
                absolutePosition: { x: left, y: top }
            });

        } else if (el.tagName.toLowerCase() === 'hr') {
            content.push({
                canvas: [{
                    type: 'line',
                    x1: left,
                    y1: top,
                    x2: left + width,
                    y2: top,
                    lineWidth: 1,
                    color: '#000000'
                }],
            });

        } else if (el.tagName.toLowerCase() === 'pol') {
            const points = parseClipPath(styles.clipPath, width, height);
            const fillColor = styles.backgroundColor
            const [r, g, b] = parseRGB(fillColor);

            if (points.length > 2) {
                const polyPoints = points.map(p => ({
                    x: p.x,
                    y: p.y
                }));

                content.push({
                    canvas: [{
                        type: 'polyline',
                        closePath: true,
                        color: rgbToHex(r, g, b),
                        points: polyPoints
                    }],
                    absolutePosition: { x: left, y: top }
                });
            }
        }
    }

    const docDefinition = { //Настраивает страницу PDF
        pageSize: { width: canvas.offsetWidth, height: canvas.offsetHeight },
        pageMargins: [0, 0, 0, 0],
        content: content
    };

    pdfMake.createPdf(docDefinition).download('canvas.pdf');
}

//Поддержка % координат и clip-path
function parseClipPath(clipPath, width, height) {
    const match = clipPath.match(/polygon\((.+)\)/);
    if (!match) return [];

    return match[1].split(',').map(point => {
        const [xRaw, yRaw] = point.trim().split(/\s+/);
        const x = xRaw.includes('%') ? (parseFloat(xRaw) / 100) * width : parseFloat(xRaw);
        const y = yRaw.includes('%') ? (parseFloat(yRaw) / 100) * height : parseFloat(yRaw);
        return { x, y };
    });
}

//Конвертация изображения в base64
function toDataURL(url) {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = function () {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.src = url;
    });
}

// Конвертация цвета
function parseRGB(rgbString) {
    const result = rgbString.match(/\d+/g);
    return result ? result.map(Number).slice(0, 3) : [0, 0, 0];
}
function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x =>
        x.toString(16).padStart(2, '0')
    ).join('');
}