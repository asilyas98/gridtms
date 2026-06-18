const fs = require('fs');
const file = 'c:/Users/Anas/Downloads/grid-tms-light-calendar/grid-tms/src/context/DataContext.tsx';
let data = fs.readFileSync(file, 'utf8');

const driverKeys = "['id', 'name', 'type', 'status', 'truckId', 'phone', 'email', 'address', 'licenseNumber', 'licenseState', 'cdlExpiry', 'medicalCardExpiry', 'mvrExpiry', 'clearinghouseStatus', 'hireDate', 'terminationDate', 'payType', 'payRate', 'complianceDocs', 'performanceMetrics', 'drugTestDate']";

const truckKeys = "['id', 'unitNumber', 'make', 'model', 'year', 'vin', 'licensePlate', 'licenseState', 'status', 'driverId', 'ownership', 'grossWeight', 'tareWeight', 'annualInspectionExpiry', 'pmDueDate', 'pmDueMileage', 'lastServiceDate', 'lastServiceMileage', 'currentMileage', 'complianceDocs', 'notes']";

const trailerKeys = "['id', 'unitNumber', 'type', 'make', 'year', 'vin', 'licensePlate', 'licenseState', 'status', 'ownership', 'length', 'annualInspectionExpiry', 'pmDueDate', 'lastServiceDate', 'complianceDocs', 'notes']";

function generateFilteredDBObj(varName, objName, keysListStr) {
    const keys = eval(keysListStr);
    let str = `const ${varName}: any = {};\n`;
    for(const k of keys) {
        if(k === 'licensePlate' && objName === 'newTrailer') {
            str += `      if ('plateNumber' in ${objName}) ${varName}['licensePlate'] = ${objName}.plateNumber;\n`;
            str += `      else if ('licensePlate' in ${objName}) ${varName}['licensePlate'] = ${objName}.licensePlate;\n`;
        } else if(k === 'licenseState' && objName === 'newTrailer') {
            str += `      if ('plateState' in ${objName}) ${varName}['licenseState'] = ${objName}.plateState;\n`;
            str += `      else if ('licenseState' in ${objName}) ${varName}['licenseState'] = ${objName}.licenseState;\n`;
        } else if (k === 'length' && objName === 'newTrailer') {
            str += `      if ('length' in ${objName}) ${varName}['length'] = parseFloat(${objName}.length) || null;\n`;
        } else {
            str += `      if ('${k}' in ${objName}) ${varName}['${k}'] = ${objName}['${k}'];\n`;
        }
    }
    return str;
}

data = data.replace(
/  const addDriver = \(driverData: Omit<Driver, 'id' \| 'truckId'>\) => {[\s\S]+?  };/,
`  const addDriver = (driverData: Omit<Driver, 'id' | 'truckId'>) => {
    const newDriver: Driver = {
      ...driverData,
      id: crypto.randomUUID(),
    };
    setDrivers(prev => [...prev, newDriver]);
    if (supabase) {
      ${generateFilteredDBObj('dbDriver', 'newDriver', driverKeys)}
      supabase.from('drivers').insert([dbDriver]).then(({ error }) => {
        if (error) console.error('Error saving driver:', error);
      });
    }
  };`
);

data = data.replace(
/  const updateDriver = \(id: string, updates: Partial<Driver>\) => {[\s\S]+?  };/,
`  const updateDriver = (id: string, updates: Partial<Driver>) => {
    setDrivers(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
    if (supabase) {
      ${generateFilteredDBObj('dbUpdates', 'updates', driverKeys)}
      if (Object.keys(dbUpdates).length > 0) {
        supabase.from('drivers').update(dbUpdates).eq('id', id).then(({ error }) => {
          if (error) console.error('Error updating driver:', error);
        });
      }
    }
  };`
);

data = data.replace(
/  const addTruck = \(truckData: Omit<Truck, 'id' \| 'driverId'>\) => {[\s\S]+?  };/,
`  const addTruck = (truckData: Omit<Truck, 'id' | 'driverId'>) => {
    const newTruck: Truck = { ...truckData, id: crypto.randomUUID() };
    setTrucks(prev => [...prev, newTruck]);
    if (supabase) {
      ${generateFilteredDBObj('dbTruck', 'newTruck', truckKeys)}
      supabase.from('trucks').insert([dbTruck]).then(({ error }) => {
        if (error) console.error('Error saving truck:', error);
      });
    }
  };`
);

data = data.replace(
/  const updateTruck = \(id: string, updates: Partial<Truck>\) => {[\s\S]+?  };/,
`  const updateTruck = (id: string, updates: Partial<Truck>) => {
    setTrucks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    if (supabase) {
      ${generateFilteredDBObj('dbUpdates', 'updates', truckKeys)}
      if (Object.keys(dbUpdates).length > 0) {
        supabase.from('trucks').update(dbUpdates).eq('id', id).then(({ error }) => {
          if (error) console.error('Error updating truck:', error);
        });
      }
    }
  };`
);

data = data.replace(
/  const addTrailer = \(trailerData: Omit<Trailer, 'id'>\) => {[\s\S]+?  };/,
`  const addTrailer = (trailerData: Omit<Trailer, 'id'>) => {
    const newTrailer: Trailer = { ...trailerData, id: crypto.randomUUID() };
    setTrailers(prev => [...prev, newTrailer]);
    if (supabase) {
      ${generateFilteredDBObj('dbTrailer', 'newTrailer', trailerKeys)}
      supabase.from('trailers').insert([dbTrailer]).then(({ error }) => {
        if (error) console.error('Error saving trailer:', error);
      });
    }
  };`
);

data = data.replace(
/  const updateTrailer = \(id: string, updates: Partial<Trailer>\) => {[\s\S]+?  };/,
`  const updateTrailer = (id: string, updates: Partial<Trailer>) => {
    setTrailers(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    if (supabase) {
      ${generateFilteredDBObj('dbUpdates', 'updates', trailerKeys)}
      if (Object.keys(dbUpdates).length > 0) {
        supabase.from('trailers').update(dbUpdates).eq('id', id).then(({ error }) => {
          if (error) console.error('Error updating trailer:', error);
        });
      }
    }
  };`
);

fs.writeFileSync(file, data);
console.log('Replaced correctly!');
