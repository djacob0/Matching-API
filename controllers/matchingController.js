const pool = require("../config/db");

const matchByMultipleFields = async (req, res) => {
  try {
    const getHeaderValues = (name) => {
      const value = req.headers[name.toLowerCase()] || req.headers[name];
      return value ? value.split(',').map(s => s.trim()).filter(s => s) : [];
    };

    const records = [];
    const maxLength = Math.max(
      getHeaderValues('RSBSASYSTEMGENERATEDNUMBER').length,
      getHeaderValues('FIRSTNAME').length,
      getHeaderValues('LASTNAME').length
    );

    for (let i = 0; i < maxLength; i++) {
      records.push({
        rsbsa_no: getHeaderValues('RSBSASYSTEMGENERATEDNUMBER')[i] || null,
        first_name: getHeaderValues('FIRSTNAME')[i] || null,
        middle_name: getHeaderValues('MIDDLENAME')[i] || null,
        surname: getHeaderValues('LASTNAME')[i] || null,
        ext_name: getHeaderValues('EXTENSIONNAME')[i] || null,
        sex: getHeaderValues('SEX')[i]?.toUpperCase() || null,
        mother_maiden_name: getHeaderValues('MOTHERMAIDENNAME')[i] || null
      });
    }

    const queries = [];
    const queryParams = [];

    records.forEach((r, idx) => {
      const conditions = [];
      const params = [];

      if (r.rsbsa_no) {
        conditions.push(`rsbsa_no = ?`);
        params.push(r.rsbsa_no);
      }

      if (r.first_name && r.surname) {
        conditions.push(`first_name = ? AND surname = ?`);
        params.push(r.first_name, r.surname);
      }

      if (r.middle_name) {
        conditions.push(`middle_name = ?`);
        params.push(r.middle_name);
      }

      if (r.ext_name) {
        conditions.push(`ext_name = ?`);
        params.push(r.ext_name);
      }

      if (r.mother_maiden_name) {
        conditions.push(`mother_maiden_name = ?`);
        params.push(r.mother_maiden_name);
      }

      if (r.sex) {
        const genderCode = r.sex.startsWith("F") ? 2 : 1;
        conditions.push(`sex = ?`);
        params.push(genderCode);
      }

      if (conditions.length) {
        queries.push(`SELECT * FROM vw_fims_rffa_intervention WHERE ${conditions.join(" AND ")} LIMIT 100`);
        queryParams.push(...params);
      }
    });

    if (!queries.length) {
      return res.status(400).json({
        success: false,
        message: "No valid search criteria provided"
      });
    }

    const finalQuery = queries.join(" UNION ALL ");

    const [rows] = await pool.query(finalQuery, queryParams);

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "No matching records found"
      });
    }

    const results = {};
    rows.forEach(row => {
      const key = row.rsbsa_no || `${row.first_name}_${row.surname}`;
      if (!results[key]) results[key] = [];
      results[key].push(row);
    });

    res.json({
      success: true,
      count: rows.length,
      foundCount: Object.keys(results).length,
      requestedCount: records.length,
      data: results
    });

  } catch (error) {
    console.error("[Matching Controller Error]", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  matchByRSBSA: matchByMultipleFields
};
