const pool = require("../config/db");

const dataCleaning = async (req, res) => {
  try {
    const rsbsaNumbers = req.headers['rsbsasystemgeneratednumber']?.split(',') || [];
    
    if (rsbsaNumbers.length === 0) {
      return res.status(400).json({ success: false, message: "No RSBSA numbers provided" });
    }

    const cleanedRecords = [];

    for (const rsbsaNo of rsbsaNumbers) {
      const [dbRecords] = await pool.query(
        `SELECT * FROM vw_fims_rffa_intervention WHERE rsbsa_no = ?`, 
        [rsbsaNo.trim()]
      );

      if (dbRecords.length > 0) {
        const dbRecord = dbRecords[0];
        cleanedRecords.push({
            RSBSASYSTEMGENERATEDNUMBER: dbRecord.rsbsa_no,
            FIRSTNAME: dbRecord.first_name,
            MIDDLENAME: dbRecord.middle_name,
            LASTNAME: dbRecord.surname,
            EXTENSIONNAME: dbRecord.ext_name,
            SEX: dbRecord.sex === 1 ? 'MALE' : dbRecord.sex === 2 ? 'FEMALE' : null,
            MOTHERMAIDENNAME: dbRecord.mother_maiden_name,
            STREETNO_PUROKNO: dbRecord.street,
            BARANGAY: dbRecord.brgy_name,
            CITYMUNICIPALITY: dbRecord.mun_name,
            PROVINCE: dbRecord.prov_name,
            DISTRICT: dbRecord.district,
            GOVTIDTYPE: dbRecord.id_type,
            REGION: dbRecord.reg_name,
            MOBILENO: dbRecord.contact_num,
            BIRTHDATE: dbRecord.birth_date,
            PLACEOFBIRTH: dbRecord.birth_address,
            status: "CLEANED"
        });
      }
    }
    res.json({
      success: true,
      cleanedCount: cleanedRecords.length,
      cleanedRecords: cleanedRecords
    });

  } catch (error) {
    console.error("[Data Cleaning Error]", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during data cleaning",
      error: error.message
    });
  }
};

module.exports = {
  dataCleaning
};