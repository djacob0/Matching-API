const pool = require("../config/db");

const matchByMultipleFields = async (req, res) => {
    try {
      const getHeaderValues = (name) => {
        const value = req.headers[name.toLowerCase()] || req.headers[name];
        return value ? value.split(',').map(s => s.trim()).filter(s => s) : [];
      };
  
      const headers = {
        rsbsaNumbers: getHeaderValues('RSBSASYSTEMGENERATEDNUMBER'),
        firstNames: getHeaderValues('FIRSTNAME'),
        middleNames: getHeaderValues('MIDDLENAME'),
        lastNames: getHeaderValues('LASTNAME'),
        extNames: getHeaderValues('EXTENSIONNAME'),
        sexes: getHeaderValues('SEX').map(s => s.toUpperCase()),
        motherMaidenNames: getHeaderValues('MOTHERMAIDENNAME')
      };
  
      const recordCount = Math.max(
        headers.rsbsaNumbers.length,
        headers.firstNames.length,
        headers.lastNames.length
      );
  
      if (recordCount === 0) {
        return res.status(400).json({
          success: false,
          message: 'No valid records provided in headers'
        });
      }
  
      let whereClauses = [];
      let queryParams = [];
  
      for (let i = 0; i < recordCount; i++) {
        const conditions = [];
        const params = [];
  
        if (i < headers.rsbsaNumbers.length && headers.rsbsaNumbers[i]) {
          conditions.push(`rsbsa_no = ?`);
          params.push(headers.rsbsaNumbers[i]);
        }
  
        if (i < headers.firstNames.length && i < headers.lastNames.length && 
            headers.firstNames[i] && headers.lastNames[i]) {
          conditions.push(`(first_name = ? AND surname = ?)`);
          params.push(headers.firstNames[i], headers.lastNames[i]);
        }
  
        if (i < headers.middleNames.length && headers.middleNames[i]) {
          conditions.push(`middle_name = ?`);
          params.push(headers.middleNames[i]);
        }
  
        if (i < headers.extNames.length && headers.extNames[i]) {
          conditions.push(`ext_name = ?`);
          params.push(headers.extNames[i]);
        }
  
        if (i < headers.motherMaidenNames.length && headers.motherMaidenNames[i]) {
          conditions.push(`mother_maiden_name = ?`);
          params.push(headers.motherMaidenNames[i]);
        }
  
        if (i < headers.sexes.length && headers.sexes[i]) {
          const genderCode = headers.sexes[i].startsWith('F') ? 2 : 1;
          conditions.push(`sex = ?`);
          params.push(genderCode);
        }
  
        if (conditions.length > 0) {
          whereClauses.push(`(${conditions.join(' AND ')})`);
          queryParams.push(...params);
        }
      }
  
      if (whereClauses.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No valid search criteria provided'
        });
      }
  
      const query = `
        SELECT * FROM vw_fims_rffa_intervention
        WHERE ${whereClauses.join(' OR ')}
        LIMIT 10000
      `;
      const [rows] = await pool.query(query, queryParams);
  
      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No matching records found'
        });
      }

      const results = {};
      rows.forEach(row => {
        const key = row.rsbsa_no || `${row.first_name}_${row.surname}`;
        if (!results[key]) {
          results[key] = [];
        }
        results[key].push(row);
      });
  
      res.json({
        success: true,
        count: rows.length,
        foundCount: Object.keys(results).length,
        requestedCount: recordCount,
        data: results
      });
  
    } catch (error) {
      console.error('[Matching Controller Error]', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  };

module.exports = {
  matchByRSBSA: matchByMultipleFields
};