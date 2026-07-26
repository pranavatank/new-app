$content = [System.IO.File]::ReadAllText('b:\Study\App\hisab\src\screens\Expense.jsx', [System.Text.Encoding]::UTF8)
$content = $content.Replace('â‚¹', '₹')
$content = $content.Replace('â–²', '▲')
$content = $content.Replace('â–¼', '▼')
$content = $content.Replace("dY'ø", '💰')
$content = $content.Replace('o' + [char]7, '✕')
[System.IO.File]::WriteAllText('b:\Study\App\hisab\src\screens\Expense.jsx', $content, [System.Text.Encoding]::UTF8)
Write-Host "Fixed encoding issues"
