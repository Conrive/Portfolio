let lastTapTime = 0;

function handleMobileDoubleTap(callback) {
    return function (e) {
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTapTime;

        if (tapLength < 300 && tapLength > 0) {
            e.preventDefault();
            callback(e);
        }

        lastTapTime = currentTime;
    };
}