# Windows Defender 處理指南

## 為什麼會被 Windows Defender 阻擋?

**Resilience Adapter** 使用 PyInstaller 打包,由於該工具常被惡意軟體使用,Windows Defender 可能會將程式誤判為可疑檔案。

**這是正常的誤報情況**,本程式是完全安全的開源工具。

---

## 🛡️ 解決方法

### 方法一:使用白名單腳本(推薦)

**步驟**:

1. **右鍵點擊** `defender_whitelist.ps1`
2. 選擇 **「以系統管理員身分執行」**
3. 在 PowerShell 視窗中按 **Y** 確認
4. 完成後即可正常使用

**說明**: 此腳本會將專案目錄加入 Windows Defender 排除清單,之後不會再被阻擋。

---

### 方法二:手動加入排除項目

如果腳本無法執行,可手動操作:

1. **開啟 Windows 安全性**
   - 按下 `Windows 鍵`,搜尋「Windows 安全性」

2. **進入病毒與威脅防護設定**
   - 點擊「病毒與威脅防護」
   - 點擊「管理設定」

3. **加入排除項目**
   - 滾動到「排除項目」
   - 點擊「新增或移除排除項目」
   - 點擊「+ 新增排除項目」
   - 選擇「資料夾」
   - 瀏覽並選擇專案資料夾: `C:\Users\YUKAI\Desktop\Gemgpt`

4. **完成**
   - 確認後,Windows Defender 將不再掃描此資料夾

---

### 方法三:暫時停用即時保護(不推薦)

**僅在安裝時使用,完成後立即重新啟用!**

1. 開啟「Windows 安全性」→「病毒與威脅防護」
2. 點擊「管理設定」
3. 關閉「即時保護」
4. 執行 `ResilienceAdapter.exe`
5. **立即重新啟用即時保護**

**警告**: 停用防毒軟體會讓系統暴露於風險中,僅短暫停用並立即恢復。

---

## 🧪 驗證程式安全性

### VirusTotal 檢測

您可以自行上傳程式到 [VirusTotal](https://www.virustotal.com/) 檢測:

1. 訪問 https://www.virustotal.com/
2. 上傳 `dist\ResilienceAdapter.exe`
3. 查看檢測結果

**預期結果**:
- 大部分防毒軟體: ✅ 未偵測
- 部分防毒軟體: ⚠️ 可疑(誤報)
- 原因: PyInstaller 打包特徵

---

## 📋 常見問題

### Q: 為什麼需要排除?

**A**: Windows Defender 使用啟發式偵測,PyInstaller 打包的程式可能觸發警報。這是誤報,不代表程式有害。

### Q: 排除後會影響安全嗎?

**A**: 僅此專案資料夾不會被掃描,系統其他部分仍受保護。如果不信任程式,請勿排除。

### Q: 如何移除排除項目?

**A**: 
1. 開啟「Windows 安全性」→「病毒與威脅防護」→「管理設定」
2. 滾動到「排除項目」→「新增或移除排除項目」
3. 找到專案路徑,點擊「移除」

### Q: 為什麼不簽名 EXE?

**A**: 數位簽名憑證需要付費($100-300 USD/年)。如果未來需要廣泛分發,會考慮購買。

### Q: 使用第三方防毒軟體怎麼辦?

**A**: `defender_whitelist.ps1` 僅支援 Windows Defender。如使用 Kaspersky、Avast 等,請參考該軟體的白名單設定方式。

---

## 🔒 安全承諾

1. **開源透明**: 所有程式碼公開可查看
2. **本地執行**: 不會上傳任何資料到外部伺服器
3. **無惡意行為**: 僅用於瀏覽器自動化,不涉及任何破壞性操作
4. **使用者控制**: 所有操作都由使用者手動觸發

---

## 💡 進階:自行簽名(可選)

如果希望減少誤報,可自行建立數位簽名:

### 建立自簽憑證

```powershell
# 1. 建立憑證(以管理員執行 PowerShell)
$cert = New-SelfSignedCertificate -Type CodeSigningCert -Subject "CN=YourName" -CertStoreLocation Cert:\CurrentUser\My

# 2. 匯出憑證
Export-Certificate -Cert $cert -FilePath "certificate.cer"

# 3. 安裝到受信任根憑證
Import-Certificate -FilePath "certificate.cer" -CertStoreLocation Cert:\LocalMachine\Root

# 4. 簽名 EXE (需先安裝 Windows SDK)
signtool sign /fd SHA256 /a "dist\ResilienceAdapter.exe"
```

**限制**: 自簽憑證僅在您的電腦上有效,分發給他人仍會有警告。

---

## 📞 遇到問題?

如果上述方法都無法解決:

1. 檢查是否使用最新版本的專案
2. 確認 Python 環境是否正確
3. 嘗試重新打包: `.\build.bat`
4. 查看 `panic.log` 或 `browser_debug.log` 取得錯誤資訊

---

**記住**: Windows Defender 阻擋是**誤報**,本程式完全安全。加入排除清單後即可正常使用。
