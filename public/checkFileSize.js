function checkFileSize(input) {
    if(input.files[0].size > 10 * 1024 * 1024) {
        alert('Превышен допустимый вес. Уменьшите размер файла.');
        input.value = '';
    } else {
        alert('Файл успешно загружен!');
    }
}