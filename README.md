## 🚀 Token Submission Checklist

Please ensure the following before submitting your pull request:

- [ ] I have added a new entry to `assets.json` in the correct chain folder (e.g., `10143/`)
- [ ] The entry includes: `address`, `name`, `symbol`, `decimals`, and optional `icon`
- [ ] The JSON file uses **2-space indentation**, no trailing commas
- [ ] The `address` is in **checksummed format** (e.g., via `viem` or [Etherscan](https://etherscan.io/address))
- [ ] The token metadata matches exactly with on-chain data (name, symbol, decimals)
- [ ] If provided, the icon file is in image format(*.png, *.svg, *.jpg, *.jpeg, *.webp*, ...) and is **named exactly as the token symbol** (e.g., `YTN.png`)
- [ ] I have not modified or reordered other existing entries

---

## 📄 Example Entry

```json
{
  "address": "0xYourTokenAddress",
  "name": "Your Token Name",
  "symbol": "YTN",
  "decimals": 18,
  "icon": "your_icon.png"
}