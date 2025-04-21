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

    const results = {};
    const unmatchedRecords = [];

    for (const [idx, record] of records.entries()) {
      let dbRecords = [];
      let fieldsToMatch = {};
      let unmatchedFields = [];
      
      if (record.rsbsa_no) {
        const [rsbsaResults] = await pool.query(
          `SELECT * FROM vw_fims_rffa_intervention WHERE rsbsa_no = ?`, 
          [record.rsbsa_no]
        );
        
        if (rsbsaResults.length > 0) {
          dbRecords = rsbsaResults;
          
          for (const dbRecord of dbRecords) {
            unmatchedFields = [];
            
            if (record.first_name && dbRecord.first_name !== record.first_name) {
              unmatchedFields.push({
                field: 'first_name',
                input: record.first_name,
                db: dbRecord.first_name
              });
            }
            
            if (record.middle_name && dbRecord.middle_name !== record.middle_name) {
              unmatchedFields.push({
                field: 'middle_name',
                input: record.middle_name,
                db: dbRecord.middle_name
              });
            }
            
            // In the RSBSA-based matching loop, inside the for (const dbRecord of dbRecords) block
            if (record.surname) {
              if (dbRecord.surname !== record.surname) {
                unmatchedFields.push({
                  field: 'surname',
                  input: record.surname,
                  db: dbRecord.surname
                });
              }
            } else if (dbRecord.surname) {
              // If input surname is null but database has a surname, treat as mismatch
              unmatchedFields.push({
                field: 'surname',
                input: null,
                db: dbRecord.surname
              });
            }
            
            if (record.ext_name && dbRecord.ext_name !== record.ext_name) {
              unmatchedFields.push({
                field: 'ext_name',
                input: record.ext_name,
                db: dbRecord.ext_name
              });
            }
            
            if (record.sex) {
              const genderCode = record.sex.startsWith("F") || record.sex.startsWith("f") ? 2 : 1;
              if (dbRecord.sex !== genderCode) {
                unmatchedFields.push({
                  field: 'sex',
                  input: record.sex,
                  db: dbRecord.sex === 1 ? 'MALE' : 'FEMALE'
                });
              }
            }
            
            if (record.mother_maiden_name && dbRecord.mother_maiden_name !== record.mother_maiden_name) {
              unmatchedFields.push({
                field: 'mother_maiden_name',
                input: record.mother_maiden_name,
                db: dbRecord.mother_maiden_name
              });
            }
            
            if (unmatchedFields.length === 0) {
              const key = record.rsbsa_no;
              if (!results[key]) results[key] = [];
              results[key].push(dbRecord);
              break;
            }
          }
          
          if (unmatchedFields.length > 0) {
            unmatchedRecords.push({
              recordIndex: idx,
              recordData: record,
              reason: 'RSBSA found but other fields do not match',
              rsbsaExists: true,
              unmatchedFields: unmatchedFields.map(f => ({ 
                field: f.field, 
                input: f.input,
                db: f.db
              }))
            });
          }
        } else {
          unmatchedRecords.push({
            recordIndex: idx,
            recordData: record,
            reason: 'RSBSA number not found in system',
            rsbsaExists: false,
            unmatchedFields: []
          });
        }
      } 
      else if (record.first_name && record.surname) {
        const [nameResults] = await pool.query(
          `SELECT * FROM vw_fims_rffa_intervention 
           WHERE LOWER(first_name) = LOWER(?) AND LOWER(surname) = LOWER(?)`, 
          [record.first_name, record.surname]
        );
        
        if (nameResults.length > 0) {
          dbRecords = nameResults;

          for (const dbRecord of dbRecords) {
            unmatchedFields = [];
            
            if (record.middle_name && dbRecord.middle_name !== record.middle_name) {
              unmatchedFields.push({
                field: 'middle_name',
                input: record.middle_name,
                db: dbRecord.middle_name
              });
            }
            
            if (record.ext_name && dbRecord.ext_name !== record.ext_name) {
              unmatchedFields.push({
                field: 'ext_name',
                input: record.ext_name,
                db: dbRecord.ext_name
              });
            }
            
            if (record.sex) {
              const genderCode = record.sex.startsWith("F") || record.sex.startsWith("f") ? 2 : 1;
              if (dbRecord.sex !== genderCode) {
                unmatchedFields.push({
                  field: 'sex',
                  input: record.sex,
                  db: dbRecord.sex === 1 ? 'MALE' : 'FEMALE'
                });
              }
            }
            
            if (record.mother_maiden_name && dbRecord.mother_maiden_name !== record.mother_maiden_name) {
              unmatchedFields.push({
                field: 'mother_maiden_name',
                input: record.mother_maiden_name,
                db: dbRecord.mother_maiden_name
              });
            }
            
            if (unmatchedFields.length === 0) {
              const key = `${record.first_name}_${record.surname}`;
              if (!results[key]) results[key] = [];
              results[key].push(dbRecord);
              break;
            }
          }

          if (unmatchedFields.length > 0) {
            unmatchedRecords.push({
              recordIndex: idx,
              recordData: record,
              reason: 'Name found but other fields do not match',
              nameExists: true,
              unmatchedFields: unmatchedFields.map(f => ({ 
                field: f.field, 
                input: f.input,
                db: f.db
              }))
            });
          }
        } else {
          unmatchedRecords.push({
            recordIndex: idx,
            recordData: record,
            reason: 'No record found with the provided name',
            nameExists: false,
            unmatchedFields: []
          });
        }
      } else {
        unmatchedRecords.push({
          recordIndex: idx,
          recordData: record,
          reason: 'Insufficient search criteria provided',
          unmatchedFields: []
        });
      }
    }

    const response = {
      success: Object.keys(results).length > 0,
      count: Object.values(results).flat().length,
      foundCount: Object.keys(results).length,
      requestedCount: records.length,
      data: results
    };

    if (unmatchedRecords.length > 0) {
      response.unmatchedRecords = unmatchedRecords;
      response.unmatchedCount = unmatchedRecords.length;
    }

    if (Object.keys(results).length === 0) {
      return res.status(404).json({
        success: false,
        message: "No matching records found",
        unmatchedRecords: unmatchedRecords
      });
    }

    res.json(response);

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