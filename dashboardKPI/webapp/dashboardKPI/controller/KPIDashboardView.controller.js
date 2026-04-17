sap.ui.define([
    'jquery.sap.global',
	"sap/ui/model/json/JSONModel",
    "./BaseController",
    "../utilities/CommonCallManager",
    "sap/viz/ui5/controls/VizFrame",
    "sap/viz/ui5/data/FlattenedDataset",
    "sap/viz/ui5/controls/common/feeds/FeedItem",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/Table",
    "sap/m/Column",
    "sap/m/ColumnListItem",
    "sap/m/Text",
    "sap/m/Label",
    "sap/m/IconTabBar",
    "sap/m/IconTabFilter",
    "sap/ui/table/TreeTable",
    "sap/ui/table/Column",
    "sap/ui/table/RowSettings",
    "sap/ui/export/Spreadsheet"
], function (jQuery, JSONModel, BaseController, CommonCallManager, VizFrame, FlattenedDataset, FeedItem,
             Dialog, Button, Table, Column, ColumnListItem, Text, Label, IconTabBar, IconTabFilter,
             TreeTable, UIColumn, RowSettings, Spreadsheet) {
	"use strict";

	return BaseController.extend("kpmg.custom.tile.dashboardKPI.dashboardKPI.controller.KPIDashboardView", {
        oKPIModel: new JSONModel(),
        _chartRefs: {},

		onInit: function () {
            this.getView().setModel(this.oKPIModel, "KPIModel");
		},

        onNavigateTo: function() {
            this.onAfterRendering();
        },
        
        onAfterRendering: function() {
            var that = this;
            var oSelectedData = that.getInfoModel().getProperty("/selectedRow");
            
            if (oSelectedData) {
                that.setHeaderData(oSelectedData);
                that.loadDataKPI();
            }
        },
        
        setHeaderData: function(oSelectedData) {
            var that = this;
            // Current date formatted as dd/MM/yyyy
            var oToday = new Date();
            var sDay = String(oToday.getDate()).padStart(2, '0');
            var sMonth = String(oToday.getMonth() + 1).padStart(2, '0');
            var sYear = oToday.getFullYear();
            var sCurrentDate = sDay + '/' + sMonth + '/' + sYear;

            var oHeader = {
                currentDate: sCurrentDate,
                actual: "",
                project: oSelectedData.project || "",
                wbe: oSelectedData.wbe || "",
                section: oSelectedData.section || "",
                sfc: oSelectedData.sfc || "",
                order: oSelectedData.order || "",
                material: oSelectedData.material || ""
            };
            that.oKPIModel.setProperty("/header", oHeader);

            // Fetch actual date from z_pod_sf_act_log
            that.loadActualDate(oSelectedData);
        },

        loadActualDate: function(oSelectedData) {
            var that = this;
            var BaseProxyURL = that.getInfoModel().getProperty("/BaseProxyURL");
            var url = BaseProxyURL + "/db/getActualDateDashboardKPI";
            var plant = that.getInfoModel().getProperty("/plant");

            var params = {
                plant: plant,
                wbe: oSelectedData.wbe || "",
                machSection: oSelectedData.section || ""
            };

            var successCallback = function(response) {
                if (response && response.actualDate) {
                    that.oKPIModel.setProperty("/header/actual", response.actualDate);
                }
            };

            var errorCallback = function(error) {
                console.log("Error fetching actual date:", error);
            };

            CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that);
        },

        loadDataKPI: function () {
            var that = this;
            let BaseProxyURL = that.getInfoModel().getProperty("/BaseProxyURL");
            let pathOrderBomApi = "/db/getDashboardKPI";
            let url = BaseProxyURL + pathOrderBomApi; 
            
            var plant = that.getInfoModel().getProperty("/plant");
            var oSelectedData = that.getInfoModel().getProperty("/selectedRow");

            let params = {
                plant: plant,
                project: oSelectedData.project,
                wbe: oSelectedData.wbe,
                sfc: oSelectedData.sfc,
                section: oSelectedData.section,
                material: oSelectedData.material,
                order: oSelectedData.order
            };

            var successCallback = function(response) {
                that.oKPIModel.setProperty("/charts", response);
                that.oKPIModel.setProperty("/charts/gruppiLevelLabel", "% All SFC");
                that.oKPIModel.setProperty("/charts/sfcProgressLabel", "SFC All Progress");
                // Inizializza gruppi e sfcProgress dal livello default "all"
                that._applyGruppiLevel("all");
                // Inizializza scostamento dal livello default "All"
                that._applyScostamentoLevel("All");
                setTimeout(function() {
                    that.renderCharts();
                }, 500);
            };
            
            var errorCallback = function(error) {
                console.log("Chiamata POST fallita:", error);
                that.oKPIModel.setProperty("/", {});
                setTimeout(function() {
                    that.renderCharts();
                }, 500);
            };

            // Compare caricamento in corso
            if (!that._oBusyDialog) {
                that._oBusyDialog = new sap.m.BusyDialog({
                    title: "Attendere",
                    text: "Caricamento della dashboard in corso...",
                    showCancelButton: false
                });
            }
            that._oBusyDialog.open();

            CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that);
        },

        // ========== RENDERING CHARTS ==========
        
        renderCharts: function() {
            var that = this;
            that._destroyAllCharts();
            
            setTimeout(function() {
                that._createPieChart("machineProgressChartContainer", "/charts/chartData/machineProgress",
                      ["#a2c997", "#c0c2be", "#3e3e3e"], "280px", "250px", "machineProgress");
                    
                that._createPieChart("sfcProgressChartContainer", "/charts/chartData/sfcProgress",
                    ["#a2c997", "#c0c2be", "#3e3e3e"], "280px", "250px", "sfcProgress");
                    
                that._createScostamentoChart("scostamentoChartContainer", "/charts/chartData/scostamento",
                    "250px", "200px", "scostamento");
                    
                that._createPieChart("mancantiChartContainer", "/charts/chartData/mancanti",
                    ["#d7022e", "#fe968b", "#a2c997"], "280px", "220px", "mancanti");
 
                that._createPieChart("evasiChartContainer", "/charts/chartData/evasi",
                    ["#a2c997", "#fe968b", "#d7022e"], "280px", "220px", "evasi");
 
                that._createPieChart("ncPresenzaChartContainer", "/charts/chartData/ncPresenza",
                    ["#d7022e", "#fe968b", "#747971"], "200px", "180px", "ncPresenza");
 
                that._createSimpleBarChart("modificheOpenChartContainer", "/charts/chartData/modificheOpen",
                    ["#d5042ebf", "#d9585d", "#fe968b"]);
 
                that._createSimpleBarChart("modificheClosedChartContainer", "/charts/chartData/modificheClosed",
                    ["#d7022e", "#d9585d", "#fe968b"]);
 
                that._createColumnChart("tipologiaVarianzeChartContainer", "/charts/chartData/tipologiaVarianze",
                    ["#747971", "#747971", "#747971", "#747971", "#747971", "#d7022e", "#747971", "#747971", "#747971", "#747971"],
                    "100%", "240px", "tipologiaVarianze");
 
                that._createColumnChart("responsabilitaVarianzeChartContainer", "/charts/chartData/responsabilitaVarianze",
                    ["#747971", "#d7022e", "#747971", "#747971", "#747971", "#747971", "#747971"],
                    "100%", "240px", "responsabilitaVarianze");

                // Spengo caricamento in corso...
                if (that._oBusyDialog) {
                    that._oBusyDialog.close();
                }
            
            }, 300);
        },
        
        _destroyAllCharts: function() {
            var that = this;
            Object.keys(that._chartRefs).forEach(function(key) {
                if (that._chartRefs[key]) {
                    that._chartRefs[key].destroy();
                }
            });
            that._chartRefs = {};
        },
        
        _createPieChart: function(sContainerId, sDataPath, aColors, sWidth, sHeight, sChartKey) {
            var that = this;
            var oContainer = that.byId(sContainerId);
            if (!oContainer) return;
            
            oContainer.removeAllItems();
            
            var aData = that.oKPIModel.getProperty(sDataPath);
            if (!aData || aData.length === 0) return;
            
            var oChartModel = new JSONModel({ items: aData });
            
            var oDataset = new FlattenedDataset({
                dimensions: [{
                    name: "Categoria",
                    value: "{label}"
                }],
                measures: [{
                    name: "Valore",
                    value: "{value}"
                }],
                data: {
                    path: "/items"
                }
            });
            
            var oVizFrame = new VizFrame({
                width: sWidth,
                height: sHeight,
                vizType: "pie",
                uiConfig: { applicationSet: "fiori" },
                dataset: oDataset
            });
            
            oVizFrame.setModel(oChartModel);
            
            oVizFrame.addFeed(new FeedItem({ uid: "size", type: "Measure", values: ["Valore"] }));
            oVizFrame.addFeed(new FeedItem({ uid: "color", type: "Dimension", values: ["Categoria"] }));
            
            oVizFrame.setVizProperties({
                plotArea: {
                    colorPalette: aColors,
                    dataLabel: {
                        visible: true,
                        type: "percentage",
                        style: { fontSize: "0.75rem" }
                    },
                    drawingEffect: "normal"
                },
                legend: {
                    visible: true,
                    position: "bottom",
                    drawingEffect: "normal"
                },
                title: { visible: false },
                interaction: {
                    selectability: { mode: "single" }
                }
            });
            
            oContainer.addItem(oVizFrame);
            that._chartRefs[sChartKey] = oVizFrame;
        },
        
        _createColumnChart: function(sContainerId, sDataPath, aColors, sWidth, sHeight, sChartKey) {
            var that = this;
            var oContainer = that.byId(sContainerId);
            if (!oContainer) return;
            
            oContainer.removeAllItems();
            
            var aData = that.oKPIModel.getProperty(sDataPath);
            if (!aData || aData.length === 0) return;
            
            var oChartModel = new JSONModel({ items: aData });
            
            var oDataset = new FlattenedDataset({
                dimensions: [{
                    name: "Categoria",
                    value: "{label}"
                }],
                measures: [{
                    name: "Valore",
                    value: "{value}"
                }],
                data: {
                    path: "/items"
                }
            });
            
            var oVizFrame = new VizFrame({
                width: sWidth,
                height: sHeight,
                vizType: "column",
                uiConfig: { applicationSet: "fiori" },
                dataset: oDataset
            });
            
            oVizFrame.setModel(oChartModel);
            
            oVizFrame.addFeed(new FeedItem({ uid: "valueAxis", type: "Measure", values: ["Valore"] }));
            oVizFrame.addFeed(new FeedItem({ uid: "categoryAxis", type: "Dimension", values: ["Categoria"] }));
            
            oVizFrame.setVizProperties({
                plotArea: {
                    colorPalette: aColors,
                    dataLabel: {
                        visible: true,
                        style: { fontSize: "0.7rem" }
                    },
                    drawingEffect: "normal"
                },
                valueAxis: {
                    title: { visible: false }
                },
                categoryAxis: {
                    title: { visible: false },
                    label: {
                        rotation: "auto"
                    }
                },
                legend: { visible: false },
                title: { visible: false },
                interaction: {
                    selectability: { mode: "single" }
                }
            });
            
            oContainer.addItem(oVizFrame);
            that._chartRefs[sChartKey] = oVizFrame;
        },
        
        _createBarChart: function(sContainerId, sDataPath, aColors, sWidth, sHeight, sChartKey) {
            var that = this;
            var oContainer = that.byId(sContainerId);
            if (!oContainer) return;
            
            oContainer.removeAllItems();
            
            var aData = that.oKPIModel.getProperty(sDataPath);
            if (!aData || aData.length === 0) return;
            
            var oChartModel = new JSONModel({ items: aData });
            
            var oDataset = new FlattenedDataset({
                dimensions: [{
                    name: "Categoria",
                    value: "{label}"
                }],
                measures: [{
                    name: "Valore",
                    value: "{value}"
                }],
                data: {
                    path: "/items"
                }
            });
            
            var oVizFrame = new VizFrame({
                width: sWidth,
                height: sHeight,
                vizType: "bar",
                uiConfig: { applicationSet: "fiori" },
                dataset: oDataset
            });
            
            oVizFrame.setModel(oChartModel);
            
            oVizFrame.addFeed(new FeedItem({ uid: "valueAxis", type: "Measure", values: ["Valore"] }));
            oVizFrame.addFeed(new FeedItem({ uid: "categoryAxis", type: "Dimension", values: ["Categoria"] }));
            
            oVizFrame.setVizProperties({
                plotArea: {
                    colorPalette: aColors,
                    dataLabel: {
                        visible: true,
                        style: { fontSize: "0.7rem" }
                    },
                    drawingEffect: "normal",
                    gap: { visible: true }
                },
                valueAxis: {
                    title: { visible: false },
                    visible: false,
                    axisTick: { visible: false }
                },
                categoryAxis: {
                    title: { visible: false },
                    axisTick: { visible: true }
                },
                legend: { visible: false },
                title: { visible: false },
                interaction: {
                    selectability: { mode: "single" }
                }
            });
            
            oContainer.addItem(oVizFrame);
            that._chartRefs[sChartKey] = oVizFrame;
        },

        /**
         * Scostamento chart: two columns - "Pianificato" (single) and "Marcato" (stacked marcate + varianza)
         */
        _createScostamentoChart: function(sContainerId, sDataPath, sWidth, sHeight, sChartKey) {
            var that = this;
            var oContainer = that.byId(sContainerId);
            if (!oContainer) return;

            oContainer.removeAllItems();

            var aData = that.oKPIModel.getProperty(sDataPath);
            if (!aData || aData.length === 0) return;

            // aData = [{label:"Ore pianificate",value:X}, {label:"Ore marcate"/"Ore completate"/"Ore effettive",value:Y}, {label:"Ore varianza",value:Z}]
            var pianificate = 0, secondValue = 0, varianza = 0;
            var secondLabel = "Ore marcate";
            aData.forEach(function(item) {
                if (item.label === "Ore pianificate") pianificate = item.value;
                else if (item.label === "Ore marcate" || item.label === "Ore completate" || item.label === "Ore effettive") {
                    secondValue = item.value;
                    secondLabel = item.label;
                }
                else if (item.label === "Ore varianza") varianza = item.value;
            });

            var categoryMap = { "Ore completate": "Completato", "Ore effettive": "Effettivo", "Ore marcate": "Marcato" };
            var secondCategory = categoryMap[secondLabel] || "Marcato";
            var oChartData = [
                { category: "Pianificato",    orePianificate: pianificate, oreSecond: 0,           oreVarianza: 0 },
                { category: secondCategory,   orePianificate: 0,          oreSecond: secondValue,  oreVarianza: varianza }
            ];

            var oChartModel = new JSONModel({ items: oChartData });

            var oDataset = new FlattenedDataset({
                dimensions: [{
                    name: "Categoria",
                    value: "{category}"
                }],
                measures: [
                    { name: "Ore pianificate", value: "{orePianificate}" },
                    { name: secondLabel,       value: "{oreSecond}" },
                    { name: "Ore varianza",    value: "{oreVarianza}" }
                ],
                data: { path: "/items" }
            });

            var oVizFrame = new VizFrame({
                width: sWidth,
                height: sHeight,
                vizType: "stacked_column",
                uiConfig: { applicationSet: "fiori" },
                dataset: oDataset
            });

            oVizFrame.setModel(oChartModel);

            oVizFrame.addFeed(new FeedItem({ uid: "valueAxis", type: "Measure", values: ["Ore pianificate", secondLabel, "Ore varianza"] }));
            oVizFrame.addFeed(new FeedItem({ uid: "categoryAxis", type: "Dimension", values: ["Categoria"] }));

            oVizFrame.setVizProperties({
                plotArea: {
                    colorPalette: ["#3e3e3e", "#c0c2be", "#d7022e"],
                    dataLabel: {
                        visible: true,
                        position: "outside",
                        style: { fontSize: "0.7rem" }
                    },
                    drawingEffect: "normal"
                },
                valueAxis: {
                    title: { visible: false }
                },
                categoryAxis: {
                    title: { visible: false }
                },
                legend: { visible: true },
                title: { visible: false },
                interaction: {
                    selectability: { mode: "single" }
                }
            });

            oContainer.addItem(oVizFrame);
            that._chartRefs[sChartKey] = oVizFrame;
        },

        /**
         * Simple horizontal bar chart using HTML - always shows all categories even with value 0
         */
        _createSimpleBarChart: function(sContainerId, sDataPath, aColors) {
            var that = this;
            var oContainer = that.byId(sContainerId);
            if (!oContainer) return;

            oContainer.removeAllItems();

            var aData = that.oKPIModel.getProperty(sDataPath);
            if (!aData || aData.length === 0) return;

            var iMax = Math.max.apply(null, aData.map(function(d) { return d.value; }));
            if (iMax === 0) iMax = 1;

            var sHtml = '<div style="width:100%;font-family:Arial,sans-serif;font-size:0.75rem;">';
            aData.forEach(function(item, i) {
                var color = aColors[i % aColors.length] || "#808080";
                var widthPct = Math.max((item.value / iMax) * 100, 0);
                // Ensure at least a thin line for 0 values
                var barWidth = item.value === 0 ? "2px" : widthPct + "%";
                var barColor = item.value === 0 ? "#d0d0d0" : color;
                sHtml += '<div style="display:flex;align-items:center;margin-bottom:4px;">';
                sHtml += '<span style="width:30px;text-align:right;margin-right:6px;color:#333;">' + item.label + '</span>';
                sHtml += '<span style="width:20px;text-align:right;margin-right:6px;color:#555;font-weight:bold;">' + item.value + '</span>';
                sHtml += '<div style="flex:1;background:#f0f0f0;height:16px;border-radius:2px;overflow:hidden;">';
                sHtml += '<div style="width:' + barWidth + ';height:100%;background:' + barColor + ';border-radius:2px;"></div>';
                sHtml += '</div></div>';
            });
            sHtml += '</div>';

            oContainer.addItem(new sap.ui.core.HTML({ content: sHtml }));
        },
        
        // ========== CHART CLICK HANDLER ==========
        
        _onChartSelect: function(sChartKey, oEvent) {
            var aData = oEvent.getParameter("data");
            if (!aData || aData.length === 0) return;
            
            var oSelectedData = aData[0].data;
            var sCategory = oSelectedData.Categoria;
            var iValue = oSelectedData.Valore;
            
            switch (sChartKey) {
                case "machineProgress":
                    this.onMachineProgressDetails();
                    break;
                case "sfcProgress":
                    this.onSFCProgressDetails();
                    break;
                case "scostamento":
                    this.onScostamentoDetails();
                    break;
                case "mancanti":
                    this.onMancantiDetails();
                    break;
                case "evasi":
                    this.onEvasiDetails();
                    break;
                case "ncPresenza":
                    this.onNCDetails();
                    break;
                case "tipologiaVarianze":
                    this.onTipologiaVarianzeDetails();
                    break;
                case "responsabilitaVarianze":
                    this.onResponsabilitaVarianzeDetails();
                    break;
                default:
                    this.showToast(sCategory + ": " + iValue);
                    break;
            }
        },
        
        // ========== EVENT HANDLERS ==========
        
        onNavBack: function() {
            var that = this;
            var oDashboardNavContainer = that.getInfoModel().getProperty("/oNavContainer");
            oDashboardNavContainer.back();
        },
        
        onSegmentedButtonSelect: function(oEvent) {
            var that = this;
            var sKey = oEvent.getParameter("key");
            var labelMap = { "all": "% All SFC", "gruppi": "% SFC Gruppi", "aggr": "% SFC Aggregati", "macr": "% SFC Macroaggregati" };
            var sfcLabelMap = { "all": "SFC All Progress", "gruppi": "SFC Gruppi Progress", "aggr": "SFC Aggregati Progress", "macr": "SFC Macroaggregati Progress" };
            that.oKPIModel.setProperty("/charts/gruppiLevelLabel", labelMap[sKey] || "% All SFC");
            that.oKPIModel.setProperty("/charts/sfcProgressLabel", sfcLabelMap[sKey] || "SFC All Progress");
            that._applyGruppiLevel(sKey);
            // Re-render the SFC chart
            if (that._chartRefs["sfcProgress"]) {
                that._chartRefs["sfcProgress"].destroy();
                delete that._chartRefs["sfcProgress"];
            }
            that._createPieChart("sfcProgressChartContainer", "/charts/chartData/sfcProgress",
                ["#a2c997", "#c0c2be", "#3e3e3e"], "280px", "250px", "sfcProgress");
        },

        onScostamentoSegmentedButtonSelect: function(oEvent) {
            var that = this;
            var sKey = oEvent.getParameter("key");
            that._applyScostamentoLevel(sKey);
            // Re-render the scostamento chart
            if (that._chartRefs["scostamento"]) {
                that._chartRefs["scostamento"].destroy();
                delete that._chartRefs["scostamento"];
            }
            that._createScostamentoChart("scostamentoChartContainer", "/charts/chartData/scostamento",
                "250px", "200px", "scostamento");
        },

        _applyGruppiLevel: function(sKey) {
            var that = this;
            var aLevelData = that.oKPIModel.getProperty("/charts/gruppiLevels/" + sKey);
            if (!aLevelData) return;
            // Derive card values from the array
            var oGruppi = {};
            aLevelData.forEach(function(item) {
                if (item.label === "SFC Da Iniziare") oGruppi.daIniziare = item.value + "%";
                if (item.label === "SFC Iniziati")    oGruppi.iniziati = item.value + "%";
                if (item.label === "SFC Completati")  oGruppi.completati = item.value + "%";
            });
            that.oKPIModel.setProperty("/charts/gruppi", oGruppi);
            // Use same data for chart
            that.oKPIModel.setProperty("/charts/chartData/sfcProgress", aLevelData);
        },

        _applyScostamentoLevel: function(sKey) {
            var that = this;
            var aLevelData = that.oKPIModel.getProperty("/charts/chartData/scostamentoLevels/" + sKey);
            if (!aLevelData) return;
            that.oKPIModel.setProperty("/charts/chartData/scostamento", aLevelData);
        },

        // ========== HELPER: API call for details ==========

        _getBaseParams: function() {
            var that = this;
            var oSelectedData = that.getInfoModel().getProperty("/selectedRow");
            return {
                plant: that.getInfoModel().getProperty("/plant"),
                project: oSelectedData.project,
                wbe: oSelectedData.wbe,
                sfc: oSelectedData.sfc,
                section: oSelectedData.section
            };
        },

        // ========== HELPER: Excel Export ==========

        _exportToExcel: function(aColumns, aData, sFileName) {
            var aExportColumns = aColumns.filter(function(col) {
                return !col.isIcon;
            }).map(function(col) {
                return { label: col.label, property: col.key, type: "String" };
            });

            var oSettings = {
                workbook: { columns: aExportColumns },
                dataSource: aData,
                fileName: sFileName || "Export.xlsx"
            };

            var oSheet = new Spreadsheet(oSettings);
            oSheet.build().finally(function() {
                oSheet.destroy();
            });
        },

        // ========== HELPER: Create detail table dialog ==========

        // ========== HELPER: Create detail table from { columns, data } response ==========

        _createDetailTable: function(oResponse, sModelName) {
            var aColumns = oResponse.columns;
            var aData = oResponse.data;
            var oModel = new JSONModel({ items: aData });

            var aColumnControls = aColumns.map(function(col) {
                return new Column({
                    header: new Label({ text: col.label, design: "Bold" }),
                    width: col.width || "auto",
                    sortIndicator: "None"
                });
            });

            var oTemplate = new ColumnListItem({
                cells: aColumns.map(function(col) {
                    return new Text({ text: "{" + sModelName + ">" + col.key + "}" });
                })
            });

            var oTable = new Table({
                columns: aColumnControls,
                growing: true,
                growingThreshold: 50,
                alternateRowColors: true,
                fixedLayout: false
            });

            oTable.setModel(oModel, sModelName);

            var oSorter = null;
            aColumnControls.forEach(function(oCol, idx) {
                oCol.attachEventOnce("columnMenuOpen", function() {});
            });

            oTable.bindItems({
                path: sModelName + ">/items",
                template: oTemplate,
                sorter: oSorter
            });

            return oTable;
        },

        _createDetailDialog: function(sTitle, oResponse, sModelName) {
            var aColumns = oResponse.columns;
            var aData = oResponse.data;
            var oModel = new JSONModel({ items: aData });

            var aTableColumns = aColumns.map(function(col) {
                return new UIColumn({
                    label: new Label({ text: col.label }),
                    sortProperty: col.key,
                    filterProperty: col.key,
                    template: new Text({ text: "{" + sModelName + ">" + col.key + "}", wrapping: false }),
                    width: col.width || "auto"
                });
            });

            var oTable = new sap.ui.table.Table({
                columns: aTableColumns,
                selectionMode: "None",
                enableColumnReordering: false,
                visibleRowCountMode: "Fixed",
                visibleRowCount: 15
            });

            oTable.setModel(oModel, sModelName);
            oTable.bindRows(sModelName + ">/items");

            var that = this;
            var oDialog = new Dialog({
                title: sTitle,
                contentWidth: "90%",
                contentHeight: "70%",
                resizable: true,
                draggable: true,
                content: [oTable],
                beginButton: new Button({
                    icon: "sap-icon://excel-attachment",
                    text: "Esporta Excel",
                    press: function() {
                        that._exportToExcel(aColumns, aData, sTitle + ".xlsx");
                    }
                }),
                endButton: new Button({
                    text: "Chiudi",
                    press: function() { oDialog.close(); }
                }),
                afterClose: function() { oDialog.destroy(); }
            });

            oDialog.open();
        },

        // ========== 2.2.1 Machine Progress Details ==========

        onMachineProgressDetails: function() {
            var oResponse = this.oKPIModel.getProperty("/charts/details/machineProgress");
            if (!oResponse) return;

            // Build summary header "Visione per tipologia"
            var oSummary = oResponse.summary || {};
            var oSummaryPanel = new sap.m.Panel({
                headerText: "Visione per tipologia",
                backgroundDesign: "Solid",
                content: [
                    new sap.m.Table({
                        columns: [
                            new Column({ header: new Label({ text: "# Macroaggregati", design: "Bold" }), hAlign: "Center" }),
                            new Column({ header: new Label({ text: "# Macroaggregati completati", design: "Bold" }), hAlign: "Center" }),
                            new Column({ header: new Label({ text: "# Aggregati", design: "Bold" }), hAlign: "Center" }),
                            new Column({ header: new Label({ text: "# Aggregati completati", design: "Bold" }), hAlign: "Center" }),
                            new Column({ header: new Label({ text: "# Gruppi", design: "Bold" }), hAlign: "Center" }),
                            new Column({ header: new Label({ text: "# Gruppi Completati", design: "Bold" }), hAlign: "Center" })
                        ],
                        items: [
                            new ColumnListItem({
                                cells: [
                                    new Text({ text: String(oSummary.macroaggregati || 0) }),
                                    new Text({ text: String(oSummary.macroaggregatiCompletati || 0) }),
                                    new Text({ text: String(oSummary.aggregati || 0) }),
                                    new Text({ text: String(oSummary.aggregatiCompletati || 0) }),
                                    new Text({ text: String(oSummary.gruppi || 0) }),
                                    new Text({ text: String(oSummary.gruppiCompletati || 0) })
                                ]
                            })
                        ]
                    })
                ]
            });
            oSummaryPanel.addStyleClass("sapUiSmallMarginBottom");

            this._createTreeTableDetailDialog(
                "Machine Progress - Stato di completamento",
                oResponse,
                "MachineDetails",
                [oSummaryPanel]
            );
        },

        // ========== 2.2.2 SFC Gruppi Progress Details ==========

        onSFCProgressDetails: function() {
            var oSegBtn = this.byId("gruppiSegmentedButton");
            var sLevel = oSegBtn ? oSegBtn.getSelectedKey() : "gruppi";
            var oResponse = this.oKPIModel.getProperty("/charts/details/sfcProgress/" + sLevel);
            if (!oResponse) return;

            // Tab 1: Riepilogo ordini
            var aOrderCols = oResponse.columns;
            var aOrderData = oResponse.data;
            var oOrderModel = new JSONModel({ items: aOrderData });
            var oOrderTable = new sap.ui.table.Table({
                columns: aOrderCols.map(function(col) {
                    return new UIColumn({
                        label: new Label({ text: col.label }),
                        sortProperty: col.key,
                        filterProperty: col.key,
                        template: new Text({ text: "{SFCOrders>" + col.key + "}", wrapping: false }),
                        width: col.width || "auto"
                    });
                }),
                selectionMode: "None",
                visibleRowCountMode: "Fixed",
                visibleRowCount: 15
            });
            oOrderTable.setModel(oOrderModel, "SFCOrders");
            oOrderTable.bindRows("SFCOrders>/items");

            // Tab 2: Tutte le operazioni
            var aOpsCols = oResponse.opsColumns;
            var aOpsData = oResponse.opsData;
            var oOpsModel = new JSONModel({ items: aOpsData });
            var oOpsTable = new sap.ui.table.Table({
                columns: aOpsCols.map(function(col) {
                    return new UIColumn({
                        label: new Label({ text: col.label }),
                        sortProperty: col.key,
                        filterProperty: col.key,
                        template: new Text({ text: "{SFCOps>" + col.key + "}", wrapping: false }),
                        width: col.width || "auto"
                    });
                }),
                selectionMode: "None",
                visibleRowCountMode: "Fixed",
                visibleRowCount: 15
            });
            oOpsTable.setModel(oOpsModel, "SFCOps");
            oOpsTable.bindRows("SFCOps>/items");

            var oIconTabBar = new IconTabBar({
                expandable: false,
                items: [
                    new IconTabFilter({ key: "ordini", text: "Ordini", content: [oOrderTable] }),
                    new IconTabFilter({ key: "operazioni", text: "Operazioni", content: [oOpsTable] })
                ]
            });

            var that = this;
            var sDialogTitle = (this.oKPIModel.getProperty("/charts/sfcProgressLabel") || "SFC Gruppi Progress") + " - Dettaglio";
            var oDialog = new Dialog({
                title: sDialogTitle,
                contentWidth: "90%",
                contentHeight: "70%",
                resizable: true,
                draggable: true,
                content: [oIconTabBar],
                beginButton: new Button({
                    icon: "sap-icon://excel-attachment",
                    text: "Esporta Excel",
                    press: function() {
                        var sSelectedKey = oIconTabBar.getSelectedKey();
                        if (sSelectedKey === "operazioni") {
                            that._exportToExcel(aOpsCols, aOpsData, sDialogTitle + " - Operazioni.xlsx");
                        } else {
                            that._exportToExcel(aOrderCols, aOrderData, sDialogTitle + " - Ordini.xlsx");
                        }
                    }
                }),
                endButton: new Button({ text: "Chiudi", press: function() { oDialog.close(); } }),
                afterClose: function() { oDialog.destroy(); }
            });
            oDialog.open();
        },

        // ========== 2.2.3 Scostamento Details ==========

        onScostamentoDetails: function() {
            var oSegBtn = this.byId("scostamentoSegmentedButton");
            var sWorkcenter = oSegBtn ? oSegBtn.getSelectedKey() : "GD";
            var oResponse = this.oKPIModel.getProperty("/charts/details/scostamento/" + sWorkcenter);
            if (oResponse) {
                this._createTreeTableDetailDialog(
                    "Scostamento - Dettaglio (netto varianza)",
                    oResponse,
                    "ScostDetails"
                );
            }
        },

        // ========== 2.3 Mancanti Details - Apre report Mancanti in nuova pagina ==========

        onMancantiDetails: function() {
            var oParams = this._getBaseParams();
            var sPodId = this.getInfoModel().getProperty("/podIdValues/MANCANTI_REPORT") || "MANCANTI_REPORT";
            var sBaseUrl = window.location.href.split("?")[0];
            var sMancantiReportUrl = sBaseUrl + "?POD_ID=" + encodeURIComponent(sPodId)
                + "&PROJECT=" + encodeURIComponent(oParams.project || "")
                + "&WBE=" + encodeURIComponent(oParams.wbe || "")
                + "&SECTION=" + encodeURIComponent(oParams.section || "")
                + "&SFC=" + encodeURIComponent(oParams.sfc || "");
            window.open(sMancantiReportUrl, "_blank");
        },

        // ========== 2.4 Evasi Details ==========

        onEvasiDetails: function() {
            var oResponse = this.oKPIModel.getProperty("/charts/details/evasi");
            if (oResponse) {
                this._createDetailDialog(
                    "Evasi - Dettaglio magazzino/RFID",
                    oResponse,
                    "EvasiDetails"
                );
            }
        },

        // ========== 2.5.1 NC Details - Apre report Defect in nuova pagina ==========

        onNCDetails: function() {
            var oParams = this._getBaseParams();
            var sPodId = this.getInfoModel().getProperty("/podIdValues/DEFECT_REPORT") || "DEFECT_REPORT";
            var sBaseUrl = window.location.href.split("?")[0];
            var sDefectReportUrl = sBaseUrl + "?POD_ID=" + encodeURIComponent(sPodId)
                + "&PROJECT=" + encodeURIComponent(oParams.project || "")
                + "&WBE=" + encodeURIComponent(oParams.wbe || "")
                + "&SECTION=" + encodeURIComponent(oParams.section || "")
                + "&SFC=" + encodeURIComponent(oParams.sfc || "");
            window.open(sDefectReportUrl, "_blank");
        },

        // ========== 2.5.2 Modifiche Engineering Details ==========

        onModificheDetails: function() {
            var oResponse = this.oKPIModel.getProperty("/charts/details/modifiche");
            if (oResponse) {
                this._createTreeTableDetailDialog(
                    "Modifiche Engineering - Dettaglio",
                    oResponse,
                    "ModificheDetails"
                );
            }
        },

        _createTreeTableDetailDialog: function(sTitle, oResponse, sModelName, aHeaderContent) {
            var aParentCols = oResponse.parentColumns;
            var aChildCols = oResponse.childColumns;
            var aTreeData = oResponse.data;

            // Merge tutte le colonne (parent + child) per un'unica TreeTable
            var allColumns = aParentCols.concat(aChildCols);

            // Trasforma dati in formato TreeTable flat con children
            var aRows = aTreeData.map(function(parent) {
                var oRow = {};
                // Popola campi parent
                aParentCols.forEach(function(col) {
                    oRow[col.key] = parent[col.key] || "";
                });
                // Popola anche campi child presenti nel parent (totali cumulativi)
                aChildCols.forEach(function(col) {
                    if (parent[col.key] !== undefined) {
                        oRow[col.key] = parent[col.key];
                    }
                });
                // Children
                oRow.children = (parent.children || []).map(function(child) {
                    var oChild = {};
                    // Campi parent vuoti per i figli
                    aParentCols.forEach(function(col) {
                        oChild[col.key] = "";
                    });
                    // Campi child
                    aChildCols.forEach(function(col) {
                        oChild[col.key] = child[col.key] !== undefined ? child[col.key] : "";
                    });
                    oChild.children = [];
                    return oChild;
                });
                return oRow;
            });

            var oModel = new JSONModel({ rows: aRows });

            // Crea colonne TreeTable
            var aTableColumns = allColumns.map(function(col) {
                if (col.isIcon) {
                    return new UIColumn({
                        label: new Label({ text: col.label }),
                        sortProperty: col.key,
                        filterProperty: col.key,
                        template: new sap.ui.core.Icon({
                            src: {
                                path: sModelName + ">" + col.key,
                                formatter: function(val) {
                                    return val === "alert" ? "sap-icon://alert" : "";
                                }
                            },
                            color: "#cc0000",
                            visible: {
                                path: sModelName + ">" + col.key,
                                formatter: function(val) {
                                    return val === "alert";
                                }
                            }
                        }),
                        width: col.width || "auto"
                    });
                }
                return new UIColumn({
                    label: new Label({ text: col.label }),
                    sortProperty: col.key,
                    filterProperty: col.key,
                    template: new Text({ text: "{" + sModelName + ">" + col.key + "}", wrapping: false }),
                    width: col.width || "auto"
                });
            });

            var oTreeTable = new TreeTable({
                columns: aTableColumns,
                selectionMode: "None",
                enableColumnReordering: false,
                expandFirstLevel: false,
                visibleRowCountMode: "Fixed",
                visibleRowCount: 15
            });

            oTreeTable.setModel(oModel, sModelName);
            oTreeTable.bindRows({
                path: sModelName + ">/rows",
                parameters: { arrayNames: ["children"] }
            });

            // Flatten tree data for Excel export (parent + children)
            var aFlatData = [];
            aTreeData.forEach(function(parent) {
                var oParentRow = {};
                allColumns.forEach(function(col) {
                    if (parent[col.key] !== undefined) oParentRow[col.key] = parent[col.key];
                    else oParentRow[col.key] = "";
                });
                aFlatData.push(oParentRow);
                (parent.children || []).forEach(function(child) {
                    var oChildRow = {};
                    allColumns.forEach(function(col) {
                        oChildRow[col.key] = child[col.key] !== undefined ? child[col.key] : "";
                    });
                    aFlatData.push(oChildRow);
                });
            });

            var aDialogContent = (aHeaderContent || []).concat([oTreeTable]);

            var that = this;
            var oDialog = new Dialog({
                title: sTitle,
                contentWidth: "95%",
                contentHeight: "70%",
                resizable: true,
                draggable: true,
                content: aDialogContent,
                beginButton: new Button({
                    icon: "sap-icon://excel-attachment",
                    text: "Esporta Excel",
                    press: function() {
                        that._exportToExcel(allColumns, aFlatData, sTitle + ".xlsx");
                    }
                }),
                endButton: new Button({
                    text: "Chiudi",
                    press: function() { oDialog.close(); }
                }),
                afterClose: function() { oDialog.destroy(); }
            });

            oDialog.open();
        },

        // ========== 2.6 Varianze Details ==========

        onTipologiaVarianzeDetails: function() {
            var oResponse = this.oKPIModel.getProperty("/charts/details/tipologiaVarianze");
            if (oResponse) {
                this._createDetailDialog(
                    "Tipologia Varianze - Dettaglio",
                    oResponse,
                    "TipologiaVarianzeDetails"
                );
            }
        },

        onResponsabilitaVarianzeDetails: function() {
            var oResponse = this.oKPIModel.getProperty("/charts/details/responsabilitaVarianze");
            if (oResponse) {
                this._createDetailDialog(
                    "Responsabilità Varianze - Dettaglio",
                    oResponse,
                    "ResponsabilitaVarianzeDetails"
                );
            }
        },

        // ========== PDF EXPORT (native print to PDF, no external libs) ==========

        /**
         * Flatten tree data (parent + children) using column definitions
         */
        _flattenTreeData: function(oResponse) {
            var aParentCols = oResponse.parentColumns || [];
            var aChildCols = oResponse.childColumns || [];
            var allColumns = aParentCols.concat(aChildCols);
            var aData = oResponse.data || [];
            var aFlat = [];
            aData.forEach(function(parent) {
                var oRow = {};
                allColumns.forEach(function(col) {
                    oRow[col.key] = parent[col.key] !== undefined ? parent[col.key] : "";
                });
                aFlat.push(oRow);
                (parent.children || []).forEach(function(child) {
                    var oChild = {};
                    allColumns.forEach(function(col) {
                        oChild[col.key] = child[col.key] !== undefined ? child[col.key] : "";
                    });
                    aFlat.push(oChild);
                });
            });
            return { columns: allColumns, data: aFlat };
        },

        /**
         * Collect all export sections from the details model.
         * Returns array of { name, columns, data } objects.
         */
        _collectExportSections: function() {
            var that = this;
            var details = that.oKPIModel.getProperty("/charts/details") || {};
            var sections = [];

            function addFlat(name, oResp) {
                if (!oResp || !oResp.columns || !oResp.data || oResp.data.length === 0) return;
                sections.push({ name: name, columns: oResp.columns.filter(function(c) { return !c.isIcon; }), data: oResp.data });
            }
            function addTree(name, oResp) {
                if (!oResp || !oResp.data || oResp.data.length === 0) return;
                var flat = that._flattenTreeData(oResp);
                sections.push({ name: name, columns: flat.columns.filter(function(c) { return !c.isIcon; }), data: flat.data });
            }

            addTree("Machine Progress", details.machineProgress);
            var oSfc = details.sfcProgress && details.sfcProgress.all;
            if (oSfc) {
                addFlat("SFC Progress Ordini", { columns: oSfc.columns, data: oSfc.data });
                addFlat("SFC Progress Operazioni", { columns: oSfc.opsColumns, data: oSfc.opsData });
            }
            addTree("Scostamento", details.scostamento && details.scostamento.All);
            addFlat("Mancanti", details.mancanti);
            addFlat("Evasi", details.evasi);
            addTree("Modifiche Engineering", details.modifiche);
            addFlat("Tipologia Varianze", details.tipologiaVarianze);
            addFlat("Responsabilita Varianze", details.responsabilitaVarianze);

            return sections;
        },

        onDownloadExcel: function() {
            var that = this;
            var sections = that._collectExportSections();
            if (sections.length === 0) {
                sap.m.MessageToast.show("Nessun dato disponibile per l'esportazione.");
                return;
            }

            // Find max column count across all sections
            var maxCols = 0;
            sections.forEach(function(s) { maxCols = Math.max(maxCols, s.columns.length); });

            // Build generic export columns (c0..cN) with empty labels
            var aExportColumns = [];
            for (var i = 0; i < maxCols; i++) {
                aExportColumns.push({ label: " ", property: "c" + i, type: "String" });
            }

            // Build combined data: section header row + column headers row + data rows + blank separator
            var aAllData = [];
            sections.forEach(function(section, sIdx) {
                // Section name row
                var oNameRow = {};
                oNameRow["c0"] = "[ " + section.name + " ]";
                aAllData.push(oNameRow);
                // Column headers row
                var oHeaderRow = {};
                section.columns.forEach(function(col, ci) { oHeaderRow["c" + ci] = col.label; });
                aAllData.push(oHeaderRow);
                // Data rows
                section.data.forEach(function(row) {
                    var oRow = {};
                    section.columns.forEach(function(col, ci) {
                        var val = row[col.key];
                        oRow["c" + ci] = (val !== undefined && val !== null) ? String(val) : "";
                    });
                    aAllData.push(oRow);
                });
                // Blank separator
                aAllData.push({});
            });

            // Generate file name
            var oHeader = that.oKPIModel.getProperty("/header") || {};
            var sFileName = "Dashboard_KPI";
            if (oHeader.project) sFileName += "_" + oHeader.project;
            if (oHeader.wbe) sFileName += "_" + oHeader.wbe;
            sFileName += ".xlsx";

            var oSheet = new Spreadsheet({
                workbook: { columns: aExportColumns, context: { sheetName: "Export KPI" } },
                dataSource: aAllData,
                fileName: sFileName,
                showProgress: false
            });
            oSheet.build().finally(function() { oSheet.destroy(); });
        },

        onDownloadPDF: function() {
            var that = this;
            var oPage = that.byId("kpiDashboardPage");
            var oDomRef = oPage && oPage.getDomRef ? oPage.getDomRef() : null;

            if (!oDomRef) {
                sap.m.MessageToast.show("Impossibile generare il PDF.");
                return;
            }

            // Clone only the dashboard page to avoid printing POD selection/shell content.
            var oPrintRoot = document.createElement("div");
            oPrintRoot.id = "kpiPrintRoot";

            var oClone = oDomRef.cloneNode(true);
            var oRect = oDomRef.getBoundingClientRect();
            oClone.style.width = Math.max(1, Math.round(oRect.width)) + "px";
            oClone.style.maxWidth = "none";
            oClone.style.margin = "0 auto";

            oPrintRoot.appendChild(oClone);
            document.body.appendChild(oPrintRoot);
            document.body.classList.add("kpi-print-mode");

            var bCleaned = false;
            var fnCleanup = function() {
                if (bCleaned) return;
                bCleaned = true;
                document.body.classList.remove("kpi-print-mode");
                if (oPrintRoot && oPrintRoot.parentNode) {
                    oPrintRoot.parentNode.removeChild(oPrintRoot);
                }
            };

            window.addEventListener("afterprint", function onAfterPrint() {
                window.removeEventListener("afterprint", onAfterPrint);
                fnCleanup();
            });

            // Let layout settle before opening print dialog.
            setTimeout(function() {
                window.print();
            }, 150);

            // Fallback cleanup in case afterprint does not fire.
            setTimeout(fnCleanup, 15000);
        },

        onExit: function() {
            this._destroyAllCharts();
        }

	});
});