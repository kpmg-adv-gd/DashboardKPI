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
    "sap/ui/table/RowSettings"
], function (jQuery, JSONModel, BaseController, CommonCallManager, VizFrame, FlattenedDataset, FeedItem,
             Dialog, Button, Table, Column, ColumnListItem, Text, Label, IconTabBar, IconTabFilter,
             TreeTable, UIColumn, RowSettings) {
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
                wbs: oSelectedData.wbs,
                sfc: oSelectedData.sfc,
                section: oSelectedData.section,
                material: oSelectedData.material,
                order: oSelectedData.order
            };

            var successCallback = function(response) {
                that.oKPIModel.setProperty("/charts", response);
                // Inizializza gruppi e sfcProgress dal livello default "gruppi"
                that._applyGruppiLevel("gruppi");
                // Inizializza scostamento dal livello default "GD"
                that._applyScostamentoLevel("GD");
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

            CommonCallManager.callProxy("POST", url, params, true, successCallback, errorCallback, that);
        },

        // ========== RENDERING CHARTS ==========
        
        renderCharts: function() {
            var that = this;
            that._destroyAllCharts();
            
            setTimeout(function() {
                that._createPieChart("machineProgressChartContainer", "/charts/chartData/machineProgress",
                    ["#7a7a7a", "#c0e0c0", "#f0f0f0"], "280px", "250px", "machineProgress");
                    
                that._createPieChart("sfcProgressChartContainer", "/charts/chartData/sfcProgress",
                    ["#7a7a7a", "#f0f0f0", "#d0d0d0"], "280px", "250px", "sfcProgress");
                    
                that._createColumnChart("scostamentoChartContainer", "/charts/chartData/scostamento",
                    ["#a0a0a0", "#c00000"], "250px", "200px", "scostamento");
                    
                that._createPieChart("mancantiChartContainer", "/charts/chartData/mancanti",
                    ["#c00000", "#f5a0a0", "#408040"], "280px", "220px", "mancanti");
                    
                that._createPieChart("evasiChartContainer", "/charts/chartData/evasi",
                    ["#c00000", "#f5a0a0", "#a0c0a0"], "280px", "220px", "evasi");
                    
                that._createPieChart("ncPresenzaChartContainer", "/charts/chartData/ncPresenza",
                    ["#c00000", "#f5a0a0", "#a0a0a0"], "200px", "180px", "ncPresenza");
                    
                that._createSimpleBarChart("modificheOpenChartContainer", "/charts/chartData/modificheOpen",
                    ["#c00000", "#f5a0a0", "#ffc0c0"]);
                    
                that._createSimpleBarChart("modificheClosedChartContainer", "/charts/chartData/modificheClosed",
                    ["#c00000", "#f5a0a0", "#ffc0c0"]);
                    
                that._createColumnChart("tipologiaVarianzeChartContainer", "/charts/chartData/tipologiaVarianze",
                    ["#808080", "#808080", "#808080", "#808080", "#808080", "#c00000", "#808080", "#808080", "#808080", "#808080"],
                    "100%", "240px", "tipologiaVarianze");
                    
                that._createColumnChart("responsabilitaVarianzeChartContainer", "/charts/chartData/responsabilitaVarianze",
                    ["#808080", "#c00000", "#808080", "#808080", "#808080", "#808080", "#808080"],
                    "100%", "240px", "responsabilitaVarianze");
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
            that._applyGruppiLevel(sKey);
            // Re-render the SFC chart
            if (that._chartRefs["sfcProgress"]) {
                that._chartRefs["sfcProgress"].destroy();
                delete that._chartRefs["sfcProgress"];
            }
            that._createPieChart("sfcProgressChartContainer", "/charts/chartData/sfcProgress",
                ["#7a7a7a", "#f0f0f0", "#d0d0d0"], "280px", "250px", "sfcProgress");
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
            that._createColumnChart("scostamentoChartContainer", "/charts/chartData/scostamento",
                ["#a0a0a0", "#c00000"], "250px", "200px", "scostamento");
        },

        _applyGruppiLevel: function(sKey) {
            var that = this;
            var aLevelData = that.oKPIModel.getProperty("/charts/gruppiLevels/" + sKey);
            if (!aLevelData) return;
            // Derive card values from the array
            var oGruppi = {};
            aLevelData.forEach(function(item) {
                if (item.label === "Da iniziare") oGruppi.daIniziare = item.value + "%";
                if (item.label === "Iniziati")    oGruppi.iniziati = item.value + "%";
                if (item.label === "Completati")  oGruppi.completati = item.value + "%";
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

        // ========== HELPER: Create detail table dialog ==========

        // ========== HELPER: Create detail table from { columns, data } response ==========

        _createDetailTable: function(oResponse, sModelName) {
            var aColumns = oResponse.columns;
            var aData = oResponse.data;
            var oModel = new JSONModel({ items: aData });

            var aColumnControls = aColumns.map(function(col) {
                return new Column({ header: new Label({ text: col.label, design: "Bold" }), width: col.width || "auto" });
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
            oTable.bindItems({
                path: sModelName + ">/items",
                template: oTemplate
            });

            return oTable;
        },

        _createDetailDialog: function(sTitle, oResponse, sModelName) {
            var aColumns = oResponse.columns;
            var aData = oResponse.data;
            var oModel = new JSONModel({ items: aData });

            var aColumnControls = aColumns.map(function(col) {
                return new Column({ header: new Label({ text: col.label, design: "Bold" }), width: col.width || "auto" });
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
            oTable.bindItems({
                path: sModelName + ">/items",
                template: oTemplate
            });

            var oDialog = new Dialog({
                title: sTitle,
                contentWidth: "90%",
                contentHeight: "70%",
                resizable: true,
                draggable: true,
                content: [oTable],
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
            if (oResponse) {
                this._createDetailDialog(
                    "Machine Progress - Stato di completamento (gerarchia ore)",
                    oResponse,
                    "MachineDetails"
                );
            }
        },

        // ========== 2.2.2 SFC Gruppi Progress Details ==========

        onSFCProgressDetails: function() {
            var oSegBtn = this.byId("gruppiSegmentedButton");
            var sLevel = oSegBtn ? oSegBtn.getSelectedKey() : "gruppi";
            var oResponse = this.oKPIModel.getProperty("/charts/details/sfcProgress/" + sLevel);
            if (oResponse) {
                this._createDetailDialog(
                    "SFC Gruppi Progress - Dettaglio",
                    oResponse,
                    "SFCDetails"
                );
            }
        },

        // ========== 2.2.3 Scostamento Details ==========

        onScostamentoDetails: function() {
            var oSegBtn = this.byId("scostamentoSegmentedButton");
            var sWorkcenter = oSegBtn ? oSegBtn.getSelectedKey() : "GD";
            var oResponse = this.oKPIModel.getProperty("/charts/details/scostamento/" + sWorkcenter);
            if (oResponse) {
                this._createDetailDialog(
                    "Scostamento - Dettaglio (netto varianza)",
                    oResponse,
                    "ScostDetails"
                );
            }
        },

        // ========== 2.3 Mancanti Details - Apre report Mancanti in nuova pagina ==========

        onMancantiDetails: function() {
            var oParams = this._getBaseParams();
            var sBaseUrl = window.location.href.split("?")[0];
            var sMancantiReportUrl = sBaseUrl + "?POD_ID=MANCANTI_REPORT"
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
            var sBaseUrl = window.location.href.split("?")[0];
            var sDefectReportUrl = sBaseUrl + "?POD_ID=DEFECT_REPORT"
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

        _createTreeTableDetailDialog: function(sTitle, oResponse, sModelName) {
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
                return new UIColumn({
                    label: new Label({ text: col.label }),
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

            var oDialog = new Dialog({
                title: sTitle,
                contentWidth: "95%",
                contentHeight: "70%",
                resizable: true,
                draggable: true,
                content: [oTreeTable],
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

        onExit: function() {
            this._destroyAllCharts();
        }

	});
});