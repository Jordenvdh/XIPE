'use client';

/**
 * Dashboard Page
 * Main page for inputting city data and viewing results
 */
import { useEffect, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Layout from '@/components/layout/Layout';
import { useApp } from '@/context/AppContext';
import { getCountries, getCountryData } from '@/lib/api/data';
import { calculateEmissions } from '@/lib/api/calculations';
import SelectInput from '@/components/forms/SelectInput';
import CityAutocomplete from '@/components/forms/CityAutocomplete';
import NumberInput from '@/components/forms/NumberInput';
import PieChart from '@/components/charts/PieChart';
import ResultTable from '@/components/tables/ResultTable';
import Alert from '@/components/forms/Alert';
import LoadingSpinner from '@/components/forms/LoadingSpinner';
import type { CountryData, SharedMode, ModalSplit } from '@/lib/types';

export default function DashboardPage() {
  const {
    dashboard,
    modalSplit,
    sharedModes,
    variables,
    results,
    loading,
    error,
    updateDashboard,
    updateModalSplit,
    updateSharedModes,
    setResults,
    setLoading,
    setError,
    resetState,
  } = useApp();

  const [countries, setCountries] = useState<string[]>([]);
  const [countryData, setCountryData] = useState<CountryData | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isLoadingCountryData, setIsLoadingCountryData] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Set mounted flag to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Load countries on mount
  useEffect(() => {
    getCountries()
      .then((data) => {
        setCountries(data);
        setError(null);
      })
      .catch((err) => {
        console.error('Error loading countries:', err);
        setError('Failed to load countries. Please refresh the page.');
      });
  }, [setError]);

  // Load country data when country changes
  useEffect(() => {
    if (dashboard.country) {
      setIsLoadingCountryData(true);
      setError(null); // Clear previous errors
      getCountryData(dashboard.country)
        .then((data) => {
          setCountryData(data);
          setError(null);
          setIsLoadingCountryData(false);
        })
        .catch((err) => {
          console.error('Error loading country data:', err);
          const errorMsg = err.response?.data?.detail || err.message || 'Unknown error';
          setError(`Failed to load country data for ${dashboard.country}: ${errorMsg}`);
          setCountryData(null);
          setIsLoadingCountryData(false);
        });
    } else {
      setCountryData(null);
      setIsLoadingCountryData(false);
    }
  }, [dashboard.country, setError]);

  // Clear city name when country changes
  useEffect(() => {
    if (dashboard.country && dashboard.cityName) {
      // Optionally clear city name when country changes
      // Uncomment the line below if you want to auto-clear city when country changes
      // updateDashboard({ cityName: '' });
    }
  }, [dashboard.country]);

  // Calculate modal split totals
  const totalModalSplit = 
    modalSplit.privateCar.split +
    modalSplit.publicTransport.road.split +
    modalSplit.publicTransport.rail.split +
    modalSplit.activeModes.cycling.split +
    modalSplit.activeModes.walking.split;

  const publicTransportTotal = 
    modalSplit.publicTransport.road.split + modalSplit.publicTransport.rail.split;
  
  const activeModesTotal = 
    modalSplit.activeModes.cycling.split + modalSplit.activeModes.walking.split;

  const publicTransportAvgDistance = 
    (modalSplit.publicTransport.road.distance + modalSplit.publicTransport.rail.distance) / 2 || 0;
  
  const activeModesAvgDistance = 
    (modalSplit.activeModes.cycling.distance + modalSplit.activeModes.walking.distance) / 2 || 0;

  // Format numeric values for consistent on-screen and PDF rendering.
  const formatNumber = (value: number, fractionDigits = 2) => {
    return Number.isFinite(value)
      ? Number(value).toLocaleString('en-GB', { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits })
      : '0.00';
  };

  // Convert a public asset into a data URL so jsPDF can embed the logos.
  const loadImageAsDataUrl = async (path: string) => {
    try {
      const response = await fetch(path);
      const blob = await response.blob();
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error(`Failed to read ${path}`));
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      console.error(`Unable to load image at ${path}`, err);
      return null;
    }
  };

  // Build and download a PDF that mirrors the visible results tables.
  const handleDownloadPdf = async () => {
    if (!results) return;
    setIsDownloadingPdf(true);

    try {
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 14;

      const [cenexLogo, geminiLogo] = await Promise.all([
        loadImageAsDataUrl('/images/cenexNL_logo.png'),
        loadImageAsDataUrl('/images/GEMINI_BANNER2.png'),
      ]);

      const logoTop = 10;
      let cenexHeight = 0;
      let geminiHeight = 0;

      if (cenexLogo) {
        const props = doc.getImageProperties(cenexLogo);
        const logoWidth = 34;
        const logoHeight = (props.height / props.width) * logoWidth;
        cenexHeight = logoHeight;
        doc.addImage(cenexLogo, 'PNG', margin, logoTop, logoWidth, logoHeight);
      }

      if (geminiLogo) {
        const props = doc.getImageProperties(geminiLogo);
        const logoWidth = 38;
        const logoHeight = (props.height / props.width) * logoWidth;
        geminiHeight = logoHeight;
        doc.addImage(geminiLogo, 'PNG', pageWidth - margin - logoWidth, logoTop, logoWidth, logoHeight);
      }

      const headerY = logoTop + Math.max(cenexHeight, geminiHeight, 0) + 10;

      doc.setFontSize(16);
      doc.text('Emission results summary', margin, headerY);
      doc.setFontSize(11);
      doc.text(`City: ${dashboard.cityName || 'N/A'}`, margin, headerY + 8);
      doc.text(`Country: ${dashboard.country || 'N/A'}`, margin, headerY + 14);

      const perModeRows = ['Car', 'Bike', 'Moped', 'e-Scooter', 'Other'].map((mode) => {
        const modeResult = results.perMode[mode] || {};
        const totalValue =
          typeof modeResult.total === 'number'
            ? modeResult.total
            : (modeResult.ttw || 0) + (modeResult.wtt || 0) + (modeResult.lca || 0);

        return [
          mode,
          `${formatNumber(modeResult.ttw ?? 0)} kg/day`,
          `${formatNumber(modeResult.wtt ?? 0)} kg/day`,
          `${formatNumber(modeResult.lca ?? 0)} kg/day`,
          `${formatNumber(totalValue)} kg/day`,
          `${formatNumber(modeResult.nox ?? 0)} g/day`,
          `${formatNumber(modeResult.pm ?? 0)} g/day`,
        ];
      });

      const startY = 56;
      autoTable(doc, {
        startY,
        margin: { left: margin, right: margin },
        head: [['Mode', 'TTW', 'WTT', 'LCA', 'Total', 'NOx', 'PM']],
        body: perModeRows,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [0, 94, 184], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 248, 255] },
      });

      const co2Totals = results.totals?.co2;
      const afterModeY = (doc as any).lastAutoTable?.finalY || startY;

      autoTable(doc, {
        startY: afterModeY + 10,
        margin: { left: margin, right: margin },
        head: [['CO2 category', 'kg/day', 'ton/year', 'ton/year/1,000 inh.']],
        body: [
          [
            'Total',
            formatNumber(co2Totals?.total?.kgPerDay ?? 0),
            formatNumber(co2Totals?.total?.tonPerYear ?? 0),
            formatNumber(co2Totals?.total?.tonPerYearPer1000 ?? 0),
          ],
          [
            'Tank-to-Wheel',
            formatNumber(co2Totals?.tankToWheel?.kgPerDay ?? 0),
            formatNumber(co2Totals?.tankToWheel?.tonPerYear ?? 0),
            formatNumber(co2Totals?.tankToWheel?.tonPerYearPer1000 ?? 0),
          ],
          [
            'Well-to-Tank',
            formatNumber(co2Totals?.wellToTank?.kgPerDay ?? 0),
            formatNumber(co2Totals?.wellToTank?.tonPerYear ?? 0),
            formatNumber(co2Totals?.wellToTank?.tonPerYearPer1000 ?? 0),
          ],
          [
            'Life-cycle',
            formatNumber(co2Totals?.lifeCycle?.kgPerDay ?? 0),
            formatNumber(co2Totals?.lifeCycle?.tonPerYear ?? 0),
            formatNumber(co2Totals?.lifeCycle?.tonPerYearPer1000 ?? 0),
          ],
        ],
        styles: { fontSize: 9 },
        headStyles: { fillColor: [0, 94, 184], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 248, 255] },
      });

      const airTotals = results.totals?.airQuality;
      const afterCo2Y = (doc as any).lastAutoTable?.finalY || startY;

      autoTable(doc, {
        startY: afterCo2Y + 10,
        margin: { left: margin, right: margin },
        head: [['Air quality', 'g/day', 'kg/year', 'kg/year/1,000 inh.']],
        body: [
          [
            'NOx',
            formatNumber(airTotals?.nox?.gPerDay ?? 0),
            formatNumber(airTotals?.nox?.kgPerYear ?? 0),
            formatNumber(airTotals?.nox?.kgPerYearPer1000 ?? 0),
          ],
          [
            'PM',
            formatNumber(airTotals?.pm?.gPerDay ?? 0),
            formatNumber(airTotals?.pm?.kgPerYear ?? 0),
            formatNumber(airTotals?.pm?.kgPerYearPer1000 ?? 0),
          ],
        ],
        styles: { fontSize: 9 },
        headStyles: { fillColor: [0, 94, 184], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 248, 255] },
      });

      // Add input values section
      const afterAirY = (doc as any).lastAutoTable?.finalY || startY;
      let currentY = afterAirY + 15;

      // Check if we need a new page
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Input values', margin, currentY);
      currentY += 8;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`Number of inhabitants: ${formatNumber(dashboard.inhabitants, 0)}`, margin, currentY);
      currentY += 6;

      // Modal split section
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Modal split', margin, currentY);
      currentY += 6;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const modalSplitRows = [
        ['Private Car', `${formatNumber(modalSplit.privateCar.split, 1)}%`, `${formatNumber(modalSplit.privateCar.distance, 1)} km`],
        ['PT Road', `${formatNumber(modalSplit.publicTransport.road.split, 1)}%`, `${formatNumber(modalSplit.publicTransport.road.distance, 1)} km`],
        ['PT Rail', `${formatNumber(modalSplit.publicTransport.rail.split, 1)}%`, `${formatNumber(modalSplit.publicTransport.rail.distance, 1)} km`],
        ['Cycling', `${formatNumber(modalSplit.activeModes.cycling.split, 1)}%`, `${formatNumber(modalSplit.activeModes.cycling.distance, 1)} km`],
        ['Walking', `${formatNumber(modalSplit.activeModes.walking.split, 1)}%`, `${formatNumber(modalSplit.activeModes.walking.distance, 1)} km`],
      ];

      autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin },
        head: [['Mode', 'Split (%)', 'Distance (km)']],
        body: modalSplitRows,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [0, 94, 184], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 248, 255] },
      });

      // Shared mobility services section
      const afterModalY = (doc as any).lastAutoTable?.finalY || startY;
      currentY = afterModalY + 10;

      // Check if we need a new page
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Shared mobility services', margin, currentY);
      currentY += 6;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const sharedModesRows = sharedModes.map((mode) => [
        mode.mode,
        formatNumber(mode.numVehicles, 0),
        `${formatNumber(mode.percentageElectric, 1)}%`,
      ]);

      autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin },
        head: [['Mode', 'Number of vehicles', 'Percentage electric']],
        body: sharedModesRows,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [0, 94, 184], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 248, 255] },
      });

      // General Variables section
      const afterSharedY = (doc as any).lastAutoTable?.finalY || startY;
      currentY = afterSharedY + 15;

      // Check if we need a new page
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('General Variables', margin, currentY);
      currentY += 8;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');

      // Helper function to format variable value (show userInput if non-zero, otherwise defaultValue)
      // This matches the logic used in calculations: userInput !== 0 ? userInput : defaultValue
      const formatVarValue = (row: { userInput: number; defaultValue: number }): string => {
        const value = row.userInput !== 0 ? row.userInput : row.defaultValue;
        // Format small numbers properly (like 0.03)
        if (Math.abs(value) < 1 && value !== 0) {
          return value.toPrecision(3).replace(/(?:\.0+|(\.\d*?[1-9]))0*$/, '$1');
        }
        return value.toFixed(1).replace(/\.0$/, '');
      };

      // General Variables table
      const generalVars = variables.general || [];
      if (generalVars.length > 0) {
        const generalRows = generalVars.map((row) => [
          row.variable.length > 50 ? row.variable.substring(0, 47) + '...' : row.variable,
          formatVarValue(row),
        ]);

        autoTable(doc, {
          startY: currentY,
          margin: { left: margin, right: margin },
          head: [['Variable', 'Value']],
          body: generalRows,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [0, 94, 184], textColor: 255 },
          alternateRowStyles: { fillColor: [245, 248, 255] },
          columnStyles: { 0: { cellWidth: 120 }, 1: { cellWidth: 60 } },
        });
        currentY = (doc as any).lastAutoTable?.finalY || currentY;
        currentY += 10;
      }

      // Traditional Modes Variables section
      if (currentY > 240) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Traditional Modes Variables', margin, currentY);
      currentY += 8;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');

      // Private Car variables
      const privateCarVars = variables.traditionalModes?.private_car || variables.traditionalModes?.privateCar || [];
      if (privateCarVars.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('Private Car', margin, currentY);
        currentY += 6;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);

        const privateCarRows = privateCarVars.map((row) => [
          row.variable.length > 50 ? row.variable.substring(0, 47) + '...' : row.variable,
          formatVarValue(row),
        ]);

        autoTable(doc, {
          startY: currentY,
          margin: { left: margin, right: margin },
          head: [['Variable', 'Value']],
          body: privateCarRows,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [0, 94, 184], textColor: 255 },
          alternateRowStyles: { fillColor: [245, 248, 255] },
          columnStyles: { 0: { cellWidth: 120 }, 1: { cellWidth: 60 } },
        });
        currentY = (doc as any).lastAutoTable?.finalY || currentY;
        currentY += 5;
      }

      // PT Road variables
      const ptRoadVars = variables.traditionalModes?.pt_road || variables.traditionalModes?.ptRoad || [];
      if (ptRoadVars.length > 0) {
        if (currentY > 250) {
          doc.addPage();
          currentY = 20;
        }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('Public Transport Road', margin, currentY);
        currentY += 6;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);

        const ptRoadRows = ptRoadVars.map((row) => [
          row.variable.length > 50 ? row.variable.substring(0, 47) + '...' : row.variable,
          formatVarValue(row),
        ]);

        autoTable(doc, {
          startY: currentY,
          margin: { left: margin, right: margin },
          head: [['Variable', 'Value']],
          body: ptRoadRows,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [0, 94, 184], textColor: 255 },
          alternateRowStyles: { fillColor: [245, 248, 255] },
          columnStyles: { 0: { cellWidth: 120 }, 1: { cellWidth: 60 } },
        });
        currentY = (doc as any).lastAutoTable?.finalY || currentY;
        currentY += 5;
      }

      // PT Rail variables
      const ptRailVars = variables.traditionalModes?.pt_rail || variables.traditionalModes?.ptRail || [];
      if (ptRailVars.length > 0) {
        if (currentY > 250) {
          doc.addPage();
          currentY = 20;
        }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('Public Transport Rail', margin, currentY);
        currentY += 6;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);

        const ptRailRows = ptRailVars.map((row) => [
          row.variable.length > 50 ? row.variable.substring(0, 47) + '...' : row.variable,
          formatVarValue(row),
        ]);

        autoTable(doc, {
          startY: currentY,
          margin: { left: margin, right: margin },
          head: [['Variable', 'Value']],
          body: ptRailRows,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [0, 94, 184], textColor: 255 },
          alternateRowStyles: { fillColor: [245, 248, 255] },
          columnStyles: { 0: { cellWidth: 120 }, 1: { cellWidth: 60 } },
        });
        currentY = (doc as any).lastAutoTable?.finalY || currentY;
        currentY += 5;
      }

      // Active Transport variables (cycling and walking)
      const activeTransportVars = variables.traditionalModes?.active_transport || variables.traditionalModes?.activeTransport || [];
      if (activeTransportVars.length > 0) {
        if (currentY > 250) {
          doc.addPage();
          currentY = 20;
        }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('Active Transport', margin, currentY);
        currentY += 6;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);

        const activeTransportRows = activeTransportVars.map((row) => [
          row.variable.length > 50 ? row.variable.substring(0, 47) + '...' : row.variable,
          formatVarValue(row),
        ]);

        autoTable(doc, {
          startY: currentY,
          margin: { left: margin, right: margin },
          head: [['Variable', 'Value']],
          body: activeTransportRows,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [0, 94, 184], textColor: 255 },
          alternateRowStyles: { fillColor: [245, 248, 255] },
          columnStyles: { 0: { cellWidth: 120 }, 1: { cellWidth: 60 } },
        });
        currentY = (doc as any).lastAutoTable?.finalY || currentY;
        currentY += 10;
      }

      // Shared Services Variables section
      if (currentY > 240) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Shared Services Variables', margin, currentY);
      currentY += 8;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');

      // Map frontend keys to display names (all possible shared services)
      const sharedServiceNames: Record<string, string> = {
        ice_car: 'Shared ICE Car',
        ice_moped: 'Shared ICE Moped',
        bike: 'Shared Bike',
        e_car: 'Shared e-Car',
        e_bike: 'Shared e-Bike',
        e_moped: 'Shared e-Moped',
        e_scooter: 'Shared e-Scooter',
        other: 'Shared Other',
        e_other: 'Shared e-Other',
      };

      // Print all shared services that exist in variables.sharedServices
      // These are the services that were used in the calculation (either explicitly set or with defaults)
      if (variables.sharedServices && Object.keys(variables.sharedServices).length > 0) {
        // Sort keys for consistent ordering
        const serviceKeys = Object.keys(variables.sharedServices).sort();
        
        for (const key of serviceKeys) {
          const vars = variables.sharedServices[key];
          // Print all services that have variables (even if empty, they were used in calculation)
          if (vars && Array.isArray(vars) && vars.length > 0) {
            if (currentY > 240) {
              doc.addPage();
              currentY = 20;
            }

            const serviceName = sharedServiceNames[key] || key;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.text(serviceName, margin, currentY);
            currentY += 6;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);

            const serviceRows = vars.map((row) => [
              row.variable.length > 50 ? row.variable.substring(0, 47) + '...' : row.variable,
              formatVarValue(row),
            ]);

            autoTable(doc, {
              startY: currentY,
              margin: { left: margin, right: margin },
              head: [['Variable', 'Value']],
              body: serviceRows,
              styles: { fontSize: 8 },
              headStyles: { fillColor: [0, 94, 184], textColor: 255 },
              alternateRowStyles: { fillColor: [245, 248, 255] },
              columnStyles: { 0: { cellWidth: 120 }, 1: { cellWidth: 60 } },
            });
            currentY = (doc as any).lastAutoTable?.finalY || currentY;
            currentY += 5;
          }
        }
      } else {
        // If no shared services in variables, print a note
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.text('No shared services variables available', margin, currentY);
        currentY += 6;
      }

      doc.save('emission-results.pdf');
    } catch (err) {
      console.error('PDF generation failed', err);
      setError('Could not create PDF. Please try again.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleCalculate = async () => {
    if (totalModalSplit !== 100) {
      const difference = Math.abs(100 - totalModalSplit);
      const direction = totalModalSplit < 100 ? 'less' : 'more';
      setError(`Modal split must equal exactly 100%. Currently ${totalModalSplit.toFixed(1)}% (${difference.toFixed(1)}% ${direction} than required).`);
      return;
    }

    setIsCalculating(true);
    setError(null);

    try {
      // Ensure variables are properly structured
      // If variables are empty, use defaults from context
      const requestVariables = {
        general: variables.general.length > 0 
          ? variables.general 
          : [
              { variable: 'Average CO2 emission intensity for electricity generation (gCO2/kWh)', userInput: 0, defaultValue: 96.0 },
              { variable: 'Well-to-Tank emissions fraction of Well-to-Wheel emissions ICE cars (%)', userInput: 0, defaultValue: 20.0 },
              { variable: 'Average age of the car fleet (years)', userInput: 0, defaultValue: 9.3 },
              { variable: 'Percentage of petrol cars in the current fleet (%)', userInput: 0, defaultValue: 42.2 },
              { variable: 'Percentage of diesel cars in the current fleet (%)', userInput: 0, defaultValue: 49.9 },
              { variable: 'Percentage of electric cars in the current fleet (%)', userInput: 0, defaultValue: 7.8 },
            ],
        traditionalModes: Object.keys(variables.traditionalModes).length > 0 
          ? variables.traditionalModes 
          : {},
        sharedServices: Object.keys(variables.sharedServices).length > 0 
          ? variables.sharedServices 
          : {},
      };

      // Prepare calculation request
      const request = {
        country: dashboard.country || '',
        cityName: dashboard.cityName || '',  // Allow empty city name
        inhabitants: dashboard.inhabitants,
        modalSplit: {
          privateCar: modalSplit.privateCar,
          publicTransport: {
            road: modalSplit.publicTransport.road,
            rail: modalSplit.publicTransport.rail,
          },
          activeModes: {
            cycling: modalSplit.activeModes.cycling,
            walking: modalSplit.activeModes.walking,
          },
        },
        sharedModes: sharedModes,
        variables: requestVariables,
      };

      const calculatedResults = await calculateEmissions(request);
      setResults(calculatedResults);
    } catch (err: any) {
      console.error('Calculation error:', err);
      // Extract detailed error message from response
      let errorMessage = 'Failed to calculate emissions';
      if (err.response?.data) {
        const errorData = err.response.data;
        if (errorData.detail) {
          // Handle Pydantic validation errors (422)
          if (Array.isArray(errorData.detail)) {
            const validationErrors = errorData.detail.map((e: any) => 
              `${e.loc?.join('.')}: ${e.msg}`
            ).join('; ');
            errorMessage = `Validation error: ${validationErrors}`;
          } else {
            errorMessage = errorData.detail;
          }
        }
      }
      setError(errorMessage);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleReset = () => {
    if (showResetConfirm) {
      // User confirmed - reset everything
      resetState();
      setShowResetConfirm(false);
      setError(null);
      setResults(null);
    } else {
      // Show confirmation
      setShowResetConfirm(true);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">XIPE Dashboard</h1>
          <div className="flex gap-2">
            {showResetConfirm && (
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 bg-gray-500 hover:bg-gray-600 dark:hover:bg-gray-700 active:bg-gray-700 dark:active:bg-gray-800 text-white rounded-lg transition-colors font-medium shadow-sm hover:shadow-md"
                aria-label="Cancel reset"
              >
                Cancel
              </button>
            )}
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 dark:hover:bg-red-800 active:bg-red-800 dark:active:bg-red-900 text-white rounded-lg transition-colors font-medium shadow-sm hover:shadow-md"
              aria-label={showResetConfirm ? "Confirm reset all fields" : "Reset all fields to default values"}
            >
              {showResetConfirm ? 'Confirm Reset' : 'Reset All'}
            </button>
          </div>
        </div>
        
        {showResetConfirm && (
          <Alert 
            message="Are you sure you want to reset all fields? This will clear all inputs including country, city, modal split, shared modes, and any custom variables. This action cannot be undone."
            type="warning"
            onClose={() => setShowResetConfirm(false)}
          />
        )}
        
        <div className="mb-8">
          <p className="mb-4 text-gray-900 dark:text-gray-300">
            To use the tool, please fill in all information requested on this page. The information 
            requested on this page is all that is needed to make a first estimation of emission changes.
          </p>
          <p className="mb-4 text-gray-900 dark:text-gray-300">
            <strong>Do you want to make an estimation using your own emission factors or other specific variables?</strong> 
            A more detailed analysis can be performed by changing specific variables, all variables used 
            in the calculations can be adjusted in the &apos;Variables&apos; pages, which can be accessed 
            by using the menu on the left.
          </p>
          <p className="text-gray-900 dark:text-gray-300">
            The estimated changes in emissions due to the introduction of shared mobility are displayed 
            at the bottom of this dashboard.
          </p>
        </div>

        {mounted && (
          <div className="mb-4">
            {error && (
              <Alert message={error} type="error" onClose={() => setError(null)} />
            )}

            {totalModalSplit !== 100 && totalModalSplit > 0 && !error && (
              <Alert 
                message={`Modal split must equal exactly 100% to calculate emissions. Current total: ${totalModalSplit.toFixed(1)}% (${totalModalSplit < 100 ? `need ${(100 - totalModalSplit).toFixed(1)}% more` : `${(totalModalSplit - 100).toFixed(1)}% too much`}).`}
                type="warning" 
              />
            )}
          </div>
        )}

        {/* City Inputs */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <SelectInput
            value={dashboard.country}
            options={countries}
            onChange={(value) => updateDashboard({ country: value })}
            label="Select your country:"
          />

          <CityAutocomplete
            value={dashboard.cityName}
            onChange={(value) => updateDashboard({ cityName: value })}
            label="City name:"
            placeholder="Type the name of the city"
            country={dashboard.country}
          />

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">Number of inhabitants:</label>
            <NumberInput
              value={dashboard.inhabitants}
              onChange={(value) => updateDashboard({ inhabitants: value })}
              min={1}
              step={1}
              format={(v) => v.toFixed(0)}
            />
          </div>
        </div>

        {/* Country Info Section */}
        {countryData && (
          <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
                The average car age in {dashboard.country} is
              </h2>
              <p className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">{countryData.averageAge} years</p>
              <p className="text-gray-900 dark:text-gray-300">
                Replacing an older car fleet with new shared mobility modes has a higher impact 
                on the emissions because older cars are in general more polluting.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
                Share of cars by fuel in {dashboard.country} (ACEA)
              </h2>
              <PieChart data={countryData.fuelDistribution} />
              <p className="text-sm text-gray-800 dark:text-gray-400 mt-4">
                The distribution of vehicles by the type of fuel is used to estimate savings air 
                quality emissions. As with all variables, these can be replaced with your own 
                values in the &apos;Variables&apos; pages.
              </p>
            </div>
          </div>
        )}

        {/* Modal Split Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">City modal split and average trip distance</h2>
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-brand-blue rounded">
            <p className="text-gray-900 dark:text-gray-300 font-semibold mb-2">
              ⚠️ Important: The modal split must equal exactly 100% to calculate emissions.
            </p>
            <p className="text-gray-900 dark:text-gray-300 mb-2">
              Please fill in the current modal split and average trip distance in the city. 
              Modal split for public transport and active modes is a summation of its sub-modes. 
              Average trip distance for public transport and active modes is the average of its sub-modes.
            </p>
            <p className="text-sm text-gray-800 dark:text-gray-400 italic">
              You can replace these with your own values in the 'Variables' pages.
            </p>
          </div>

          <div className="space-y-4">
            {/* Private Car */}
            <div className="grid grid-cols-3 gap-4 items-center">
              <div className="font-medium text-gray-900 dark:text-white">Private Car</div>
              <NumberInput
                value={modalSplit.privateCar.split}
                onChange={(value) => updateModalSplit({ 
                  privateCar: { ...modalSplit.privateCar, split: value } 
                })}
                label=""
                max={100}
                step={0.1}
                format={(v) => `${v.toFixed(1)}%`}
              />
              <NumberInput
                value={modalSplit.privateCar.distance}
                onChange={(value) => updateModalSplit({ 
                  privateCar: { ...modalSplit.privateCar, distance: value } 
                })}
                label=""
                step={0.01}
                format={(v) => `${v.toFixed(1)} km`}
              />
            </div>

            {/* Public Transport */}
            <div className="grid grid-cols-3 gap-4 items-center">
              <div className="font-medium text-gray-900 dark:text-white">Public Transport</div>
              <div className="bg-brand-blue/20 px-4 py-2 rounded text-brand-blue dark:text-blue-300 font-medium">
                {publicTransportTotal.toFixed(1)}%
              </div>
              <div className="bg-brand-blue/20 px-4 py-2 rounded text-brand-blue dark:text-blue-300 font-medium">
                {publicTransportAvgDistance.toFixed(1)} km
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 items-center ml-8">
                  <div className="text-right text-gray-800 dark:text-gray-400">Road</div>
              <NumberInput
                value={modalSplit.publicTransport.road.split}
                onChange={(value) => updateModalSplit({ 
                  publicTransport: { 
                    ...modalSplit.publicTransport, 
                    road: { ...modalSplit.publicTransport.road, split: value } 
                  } 
                })}
                label=""
                max={100}
                step={0.1}
                format={(v) => `${v.toFixed(1)}%`}
              />
              <NumberInput
                value={modalSplit.publicTransport.road.distance}
                onChange={(value) => updateModalSplit({ 
                  publicTransport: { 
                    ...modalSplit.publicTransport, 
                    road: { ...modalSplit.publicTransport.road, distance: value } 
                  } 
                })}
                label=""
                step={0.01}
                format={(v) => `${v.toFixed(1)} km`}
              />
            </div>

            <div className="grid grid-cols-3 gap-4 items-center ml-8">
              <div className="text-right text-gray-800 dark:text-gray-400">Rail</div>
              <NumberInput
                value={modalSplit.publicTransport.rail.split}
                onChange={(value) => updateModalSplit({ 
                  publicTransport: { 
                    ...modalSplit.publicTransport, 
                    rail: { ...modalSplit.publicTransport.rail, split: value } 
                  } 
                })}
                label=""
                max={100}
                step={0.1}
                format={(v) => `${v.toFixed(1)}%`}
              />
              <NumberInput
                value={modalSplit.publicTransport.rail.distance}
                onChange={(value) => updateModalSplit({ 
                  publicTransport: { 
                    ...modalSplit.publicTransport, 
                    rail: { ...modalSplit.publicTransport.rail, distance: value } 
                  } 
                })}
                label=""
                step={0.01}
                format={(v) => `${v.toFixed(1)} km`}
              />
            </div>

            {/* Active Modes */}
            <div className="grid grid-cols-3 gap-4 items-center">
              <div className="font-medium text-gray-900 dark:text-white">Active modes</div>
              <div className="bg-brand-blue/20 px-4 py-2 rounded text-brand-blue dark:text-blue-300 font-medium">
                {activeModesTotal.toFixed(1)}%
              </div>
              <div className="bg-brand-blue/20 px-4 py-2 rounded text-brand-blue dark:text-blue-300 font-medium">
                {activeModesAvgDistance.toFixed(1)} km
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 items-center ml-8">
                  <div className="text-right text-gray-800 dark:text-gray-400">Cycling</div>
              <NumberInput
                value={modalSplit.activeModes.cycling.split}
                onChange={(value) => updateModalSplit({ 
                  activeModes: { 
                    ...modalSplit.activeModes, 
                    cycling: { ...modalSplit.activeModes.cycling, split: value } 
                  } 
                })}
                label=""
                max={100}
                step={0.1}
                format={(v) => `${v.toFixed(1)}%`}
              />
              <NumberInput
                value={modalSplit.activeModes.cycling.distance}
                onChange={(value) => updateModalSplit({ 
                  activeModes: { 
                    ...modalSplit.activeModes, 
                    cycling: { ...modalSplit.activeModes.cycling, distance: value } 
                  } 
                })}
                label=""
                step={0.01}
                format={(v) => `${v.toFixed(1)} km`}
              />
            </div>

            <div className="grid grid-cols-3 gap-4 items-center ml-8">
                  <div className="text-right text-gray-800 dark:text-gray-400">Walking</div>
              <NumberInput
                value={modalSplit.activeModes.walking.split}
                onChange={(value) => updateModalSplit({ 
                  activeModes: { 
                    ...modalSplit.activeModes, 
                    walking: { ...modalSplit.activeModes.walking, split: value } 
                  } 
                })}
                label=""
                max={100}
                step={0.1}
                format={(v) => `${v.toFixed(1)}%`}
              />
              <NumberInput
                value={modalSplit.activeModes.walking.distance}
                onChange={(value) => updateModalSplit({ 
                  activeModes: { 
                    ...modalSplit.activeModes, 
                    walking: { ...modalSplit.activeModes.walking, distance: value } 
                  } 
                })}
                label=""
                step={0.01}
                format={(v) => `${v.toFixed(1)} km`}
              />
            </div>

            {/* Total */}
            <div className="grid grid-cols-3 gap-4 items-center">
              <div className="font-medium text-gray-900 dark:text-white">Total</div>
              <div className={`px-4 py-2 rounded font-semibold ${
                totalModalSplit === 100 
                  ? 'bg-green-500/20 text-green-700 dark:text-green-300 border-2 border-green-500' 
                  : 'bg-red-500/20 text-red-900 dark:text-red-300 border-2 border-red-500'
              }`}>
                {totalModalSplit.toFixed(1)}%
                {totalModalSplit !== 100 && (
                  <span className="ml-2 text-xs font-normal">
                    ({totalModalSplit < 100 ? `+${(100 - totalModalSplit).toFixed(1)}%` : `-${(totalModalSplit - 100).toFixed(1)}%`} needed)
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {totalModalSplit === 100 ? (
                  <span className="text-green-600 dark:text-green-400">✓ Valid</span>
                ) : (
                  <span className="text-red-600 dark:text-red-400">⚠ Must be 100%</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Shared Mobility Services */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">Shared Mobility Services</h2>
          <p className="text-gray-900 dark:text-gray-300 mb-6">
            Please fill in the number of shared vehicles per mode and the percentage of them that is electric. 
            e-Scooters will always be electric and are therefore prefilled with 100%. Click the Save Data button 
            to save the data in the table.
          </p>

          <div className="overflow-x-auto mb-4">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-600">
                  <th className="text-left p-3 font-semibold text-gray-900 dark:text-white">Shared Modes</th>
                  <th className="text-left p-3 font-semibold text-gray-900 dark:text-white">Number of Shared Vehicles</th>
                  <th className="text-left p-3 font-semibold text-gray-900 dark:text-white">Percentage Electric</th>
                </tr>
              </thead>
              <tbody>
                {sharedModes.map((mode, index) => (
                  <tr key={index} className="border-b border-gray-200 dark:border-gray-700">
                    <td className="p-3 text-gray-900 dark:text-white">{mode.mode}</td>
                    <td className="p-3">
                      <input
                        type="number"
                        value={mode.numVehicles}
                        onChange={(e) => {
                          const updated = [...sharedModes];
                          updated[index] = { ...updated[index], numVehicles: parseInt(e.target.value) || 0 };
                          updateSharedModes(updated);
                        }}
                        className="w-full bg-table-input text-dark-text px-3 py-2 rounded border border-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-blue"
                        min="0"
                        step="1"
                        disabled={loading}
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        value={mode.percentageElectric}
                        onChange={(e) => {
                          const updated = [...sharedModes];
                          updated[index] = { 
                            ...updated[index], 
                            percentageElectric: parseFloat(e.target.value) || 0 
                          };
                          updateSharedModes(updated);
                        }}
                        className="w-full bg-table-input text-dark-text px-3 py-2 rounded border border-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-blue"
                        min="0"
                        max="100"
                        step="1"
                        disabled={loading || mode.mode === 'e-Scooter'}
                      />
                      {mode.mode === 'e-Scooter' && (
                            <span className="text-xs text-gray-800 dark:text-gray-400 ml-2">(Always electric)</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6">
            {totalModalSplit !== 100 && (
              <Alert 
                message={`Cannot calculate: Modal split must equal exactly 100%. Current total: ${totalModalSplit.toFixed(1)}%`}
                type="error"
              />
            )}
            <button
              onClick={handleCalculate}
              disabled={isCalculating || loading || totalModalSplit !== 100}
              className="mt-4 bg-brand-blue hover:bg-blue-600 dark:hover:bg-blue-700 active:bg-blue-700 dark:active:bg-blue-800 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg transition-colors font-semibold text-lg shadow-lg hover:shadow-xl disabled:shadow-none w-full"
              aria-label="Calculate emissions based on current inputs"
            >
              {isCalculating ? 'Calculating...' : 'Calculate Emissions'}
            </button>
            {totalModalSplit !== 100 && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400 text-center">
                Adjust modal split values above to reach exactly 100%
              </p>
            )}
          </div>
        </div>

        {/* Results Section */}
        {isCalculating && (
          <div className="my-8">
            <LoadingSpinner size="lg" text="Calculating emissions..." />
          </div>
        )}

        {results && !isCalculating && (
          <div className="mt-8">
            <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">Results of the analysis</h2>
            <p className="text-gray-900 dark:text-gray-300 mb-6">
              The tables below show the emission changes due to the introduction of shared mobility. 
              The first table shows the changes per shared mobility service and the second table the 
              total emission changes in the city per day, year and per year per 1000 inhabitants. 
              <span className="text-green-300">Green cells</span> indicate a reduction in emissions, 
              <span className="text-red-300"> red cells</span> indicate an increase in emissions and 
              <span className="text-yellow-300"> yellow cells</span> indicate no changes.
            </p>
            <p className="text-gray-800 dark:text-gray-400 mb-6 text-sm">
              Please remember, you can recalculate the emission changes using your own emission factors 
              or other variables by accessing the &apos;Variables&apos; pages accessible on the left!
            </p>

            <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
              Estimated emission change per shared mode in {dashboard.cityName || 'the city'}
            </h3>

            {/* CO2 Results Table */}
            <ResultTable
              data={(() => {
                // Helper function to calculate per-mode totals
                const getModeData = (mode: string) => {
                  const modeData = results.perMode[mode];
                  const ttw = modeData?.ttw || 0;
                  const wtt = modeData?.wtt || 0;
                  const lca = modeData?.lca || 0;
                  // Calculate TOTAL as sum of the three rows above
                  return [ttw, wtt, lca, ttw + wtt + lca];
                };
                
                return {
                  'Car': getModeData('Car'),
                  'Bike': getModeData('Bike'),
                  'Moped': getModeData('Moped'),
                  'e-Scooter': getModeData('e-Scooter'),
                  'Other': getModeData('Other'),
                };
              })()}
              rowLabels={[
                'Tank-to-Wheel (kg/day)',
                'Well-to-Tank (kg/day)',
                'Additional life-cycle emissions (kg/day)',
                'TOTAL (kg/day)',
              ]}
              columnLabels={['Car', 'Bike', 'Moped', 'e-Scooter', 'Other']}
              title="Estimated CO2 change"
            />

            {/* Air Quality Results Table */}
            <ResultTable
              data={{
                'Car': [results.perMode.Car?.nox || 0, results.perMode.Car?.pm || 0],
                'Bike': [results.perMode.Bike?.nox || 0, results.perMode.Bike?.pm || 0],
                'Moped': [results.perMode.Moped?.nox || 0, results.perMode.Moped?.pm || 0],
                'e-Scooter': [results.perMode['e-Scooter']?.nox || 0, results.perMode['e-Scooter']?.pm || 0],
                'Other': [results.perMode.Other?.nox || 0, results.perMode.Other?.pm || 0],
              }}
              rowLabels={['NOx (g/day)', 'PM (g/day)']}
              columnLabels={['Car', 'Bike', 'Moped', 'e-Scooter', 'Other']}
              title="Estimated air quality emission change"
            />

            <h3 className="text-2xl font-bold mb-4 mt-8 text-gray-900 dark:text-white">
              Estimated total emission change in {dashboard.cityName || 'the city'}
            </h3>

            {/* Total CO2 Results */}
            <ResultTable
              data={{
                'Total': [
                  results.totals?.co2?.total?.kgPerDay ?? 0,
                  results.totals?.co2?.total?.tonPerYear ?? 0,
                  results.totals?.co2?.total?.tonPerYearPer1000 ?? 0,
                ],
                'Tank-to-Wheel': [
                  results.totals?.co2?.tankToWheel?.kgPerDay ?? 0,
                  results.totals?.co2?.tankToWheel?.tonPerYear ?? 0,
                  results.totals?.co2?.tankToWheel?.tonPerYearPer1000 ?? 0,
                ],
                'Well-to-Tank': [
                  results.totals?.co2?.wellToTank?.kgPerDay ?? 0,
                  results.totals?.co2?.wellToTank?.tonPerYear ?? 0,
                  results.totals?.co2?.wellToTank?.tonPerYearPer1000 ?? 0,
                ],
                'Life-cyle': [
                  results.totals?.co2?.lifeCycle?.kgPerDay ?? 0,
                  results.totals?.co2?.lifeCycle?.tonPerYear ?? 0,
                  results.totals?.co2?.lifeCycle?.tonPerYearPer1000 ?? 0,
                ],
              }}
              rowLabels={['kg/day', 'ton/year', 'ton/year/1,000 inhabitants']}
              columnLabels={['Total', 'Tank-to-Wheel', 'Well-to-Tank', 'Life-cyle']}
              title="Estimated CO2 change"
            />

            {/* Total Air Quality Results */}
            <ResultTable
              data={{
                'NOx': [
                  results.totals?.airQuality?.nox?.gPerDay ?? 0,
                  results.totals?.airQuality?.nox?.kgPerYear ?? 0,
                  results.totals?.airQuality?.nox?.kgPerYearPer1000 ?? 0,
                ],
                'PM': [
                  results.totals?.airQuality?.pm?.gPerDay ?? 0,
                  results.totals?.airQuality?.pm?.kgPerYear ?? 0,
                  results.totals?.airQuality?.pm?.kgPerYearPer1000 ?? 0,
                ],
              }}
              rowLabels={['g/day', 'kg/year', 'kg/year/1,000 inhabitants']}
              columnLabels={['NOx', 'PM']}
              title="Estimated air quality emission change"
            />

            {/* Download PDF button placed at the bottom of the results */}
            <div className="mt-8 flex justify-end">
              <button
                onClick={handleDownloadPdf}
                disabled={isDownloadingPdf}
                className="bg-brand-blue hover:bg-blue-600 dark:hover:bg-blue-700 active:bg-blue-700 dark:active:bg-blue-800 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg transition-colors font-semibold shadow-lg hover:shadow-xl disabled:shadow-none"
                aria-label="Download the emission results as a PDF"
              >
                {isDownloadingPdf ? 'Preparing PDF...' : 'Download results as PDF'}
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

