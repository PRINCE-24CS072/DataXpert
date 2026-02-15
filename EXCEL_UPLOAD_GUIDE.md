# Excel/CSV Upload Format Guide

## 📊 Required Columns

Your Excel or CSV file must have these columns:

| Column Name | Type | Required | Description |
|-------------|------|----------|-------------|
| `date` | Date | Yes | Transaction date (YYYY-MM-DD or DD/MM/YYYY) |
| `category` | Text | Yes | Category name (Sales, Expenses, etc.) |
| `amount` | Number | Yes | Transaction amount (positive or negative) |
| `description` | Text | No | Optional description |

---

## ✅ Example Excel/CSV File

### CSV Format:
```csv
date,category,amount,description
2024-01-15,Sales,5000,January product sales
2024-01-16,Expenses,1200,Office supplies
2024-01-17,Sales,3500,Online orders
2024-01-18,Expenses,800,Internet and utilities
2024-01-19,Sales,6200,Bulk order from client
2024-01-20,Expenses,2500,Marketing campaign
```

### Excel Format:
| date | category | amount | description |
|------|----------|--------|-------------|
| 2024-01-15 | Sales | 5000 | January product sales |
| 2024-01-16 | Expenses | 1200 | Office supplies |
| 2024-01-17 | Sales | 3500 | Online orders |
| 2024-01-18 | Expenses | 800 | Internet and utilities |
| 2024-01-19 | Sales | 6200 | Bulk order from client |
| 2024-01-20 | Expenses | 2500 | Marketing campaign |

---

## 📝 Categories Examples

### Common Sales Categories:
- Sales
- Product Sales
- Service Revenue
- Online Sales
- Wholesale
- Retail

### Common Expense Categories:
- Expenses
- Office Supplies
- Rent
- Utilities
- Marketing
- Salaries
- Travel
- Equipment

---

## ⚠️ Important Notes

### Date Format:
- ✅ Accepted: `2024-01-15`, `15/01/2024`, `01-15-2024`
- ❌ Not accepted: `Jan 15`, `15th January`, text dates

### Amount Format:
- ✅ Accepted: `1000`, `1000.50`, `-500` (negative for expenses)
- ❌ Not accepted: `$1000`, `1,000`, `1000 USD` (no currency symbols)

### File Size:
- Maximum: No strict limit, but keep reasonable (< 10,000 rows recommended)
- Processed row by row with error reporting

### Supported File Types:
- ✅ `.xlsx` (Excel 2007+)
- ✅ `.xls` (Excel 97-2003)
- ✅ `.csv` (Comma-separated values)

---

## 🎯 Sample Files

### Download Sample Template
Create a file named `sample_business_data.csv` with this content:

```csv
date,category,amount,description
2024-01-01,Sales,10000,Opening month sales
2024-01-05,Expenses,2000,Office rent
2024-01-10,Sales,15000,Mid-month sales boost
2024-01-15,Expenses,500,Marketing materials
2024-01-20,Sales,8000,End of week sales
2024-01-25,Expenses,1200,Employee training
2024-01-30,Sales,12000,Month-end sales
```

### Excel Template
1. Open Microsoft Excel or Google Sheets
2. Create columns: `date`, `category`, `amount`, `description`
3. Fill in your data
4. Save as `.xlsx` or export as `.csv`

---

## 🚀 Upload Steps

1. **Prepare Your File**
   - Ensure all required columns are present
   - Check date and amount formats
   - Remove any empty rows

2. **Upload**
   - Click "Upload File" button in dashboard
   - Drag and drop your file OR click to browse
   - Wait for upload progress

3. **Verify**
   - Check success message for record count
   - View uploaded data in dashboard
   - Charts will update automatically

4. **Handle Errors**
   - If errors occur, check the error message
   - Common issues:
     - Missing columns
     - Invalid date format
     - Non-numeric amount
     - Empty required fields

---

## 🔍 After Upload

### What Happens:
1. File is validated for correct format
2. Each row is parsed and validated
3. Valid rows are inserted into database
4. Dashboard automatically refreshes
5. Success message shows records added

### Dashboard Updates:
- Total sales statistic
- Total expenses statistic
- Charts update with new data
- Recent transactions table

---

## 💡 Tips

### For Large Files:
- Upload in batches (recommended: 500-1000 rows per file)
- Wait for each upload to complete before next
- Monitor progress bar

### For Better Organization:
- Use consistent category names
- Add descriptions for clarity
- Keep date formats consistent
- Review data before upload

### Best Practices:
- Backup your data before upload
- Test with small file first
- Verify data after upload
- Use manual entry for individual transactions
- Use upload for bulk historical data

---

## 🆘 Troubleshooting

### Error: "Missing required columns"
**Solution:** Ensure your file has `date`, `category`, and `amount` columns with exact spelling (lowercase).

### Error: "Invalid file type"
**Solution:** Save your file as `.xlsx`, `.xls`, or `.csv` format only.

### Error: "Error reading file"
**Solution:** 
- Ensure file is not corrupted
- Open and re-save the file
- Try converting to CSV format

### Upload stuck at 90%
**Solution:**
- Large files may take time
- Check internet connection
- Try refreshing and uploading again

### Data not appearing
**Solution:**
- Refresh dashboard page
- Check browser console for errors
- Verify data was inserted successfully

---

## 📧 Need Help?

If you encounter any issues:
1. Check the error message displayed
2. Review this guide for format requirements
3. Try with sample data first
4. Check browser console (F12) for detailed errors
5. Verify backend is running

---

**Happy Data Uploading! 📈**
