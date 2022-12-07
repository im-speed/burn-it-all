import React from 'react';
import './App.css';
import BigRedButton from './components/bigRedButton';
import BuildingsDisplay from './components/buildingsDisplay';
import BuildingStore from './components/buildingsStore';
import EmissionsCounter from './components/emissionsCounter';
import UpgradeList from './components/upgradeList';
import currentCost from './js/calculators';
import ProductionHandler from './js/productionHandler';
const upgradesJson = require('./data/upgrades.json');
const buildingsJson = require('./data/buildings.json');
const lang_en_US = require('./lang/en_US.json');

let buildingsData = {};
buildingsJson.forEach((building) => {
  buildingsData[building.name] = {
    ...building,
    count: 0,
  };
});

export default class App extends React.Component {
  productionHandler = new ProductionHandler(buildingsData);
  lastUpdate = Date.now();

  constructor(props) {
    super(props);

    const loadData = this.tryLoadFromLocal();

    this.state = loadData.state || {
      currentEmissions: 0,
      totalEmissions: 0,
      unlocks: [],
      upgrades: [],
      buildings: buildingsData,
      lang: lang_en_US,
    };

    this.loadFromLocal = this.loadFromLocal.bind(this);
    this.addEmissions = this.addEmissions.bind(this);
    this.gainPassiveEmissions = this.gainPassiveEmissions.bind(this);
    this.getSingleBuildingProduction = this.getSingleBuildingProduction.bind(this);
    this.onUpgradePurchase = this.onUpgradePurchase.bind(this);
    this.onBuildingPurchase = this.onBuildingPurchase.bind(this);
    window.onunload = () => this.saveToLocal();
  }

  componentDidMount() {
    this.update = setInterval(() => this.gainPassiveEmissions(), 50);
    this.autoSave = setInterval(() => this.saveToLocal(), 60 * 1000); // saves progress every minute
    localStorage.setItem('restart', false);
  }

  componentWillUnmount() {
    clearInterval(this.update);
    clearInterval(this.autoSave);
  }

  saveToLocal() {
    const saveData = {};

    saveData.state = this.state;
    saveData.productionMultipliers = this.productionHandler.multipliers;

    localStorage.setItem('save0', JSON.stringify(saveData));
  }

  tryLoadFromLocal() {
    if (
      localStorage.getItem('save0') &&
      localStorage.getItem('save0') !== 'undefined' &&
      localStorage.getItem('restart') !== 'true'
    ) {
      return this.loadFromLocal();
    }

    return {};
  }

  loadFromLocal() {
    const loadData = JSON.parse(localStorage.getItem('save0'));

    for (const key in buildingsData) {
      if (loadData.state.buildings.hasOwnProperty(key)) {
        // Only load count from local storage
        buildingsData[key].count = loadData.state.buildings[key].count;
      }
    }

    loadData.state.buildings = buildingsData;

    // Load all previously purchased upgrades
    upgradesJson
      .filter((upgrade) => loadData.state.upgrades.includes(upgrade.name))
      .forEach((upgrade) => this.productionHandler.newUpgrade(upgrade));

    console.log(loadData);
    return loadData;
  }

  clearLocal() {
    localStorage.setItem('save0', undefined);
    localStorage.setItem('restart', true);

    window.location.reload();
  }

  addEmissions(amount) {
    this.setState((state) => ({
      currentEmissions: state.currentEmissions + amount,
      totalEmissions: state.totalEmissions + amount,
    }));
  }

  gainPassiveEmissions() {
    const now = Date.now();
    const deltaTime = now - this.lastUpdate;
    this.lastUpdate = now;

    const production = this.productionHandler.getBuildingsProduction(
      this.state.buildings,
      deltaTime
    );

    this.addEmissions(production);
  }

  getSingleBuildingProduction(buildingData) {
    let building = {};
    building[buildingData.name] = buildingData;

    return this.productionHandler.getBuildingsProduction(building, 1000);
  }

  onUpgradePurchase(upgrade) {
    if (this.state.currentEmissions >= upgrade.cost) {
      this.productionHandler.newUpgrade(upgrade);

      this.setState((state) => ({
        upgrades: [...state.upgrades, upgrade.name],
        unlocks: [...state.unlocks, upgrade.name],
        currentEmissions: state.currentEmissions - upgrade.cost,
      }));
    }
  }

  onBuildingPurchase(building) {
    const cost = currentCost(
      this.state.buildings[building].cost,
      this.state.buildings[building].count
    );

    if (this.state.currentEmissions >= cost) {
      let newBuildings = this.state.buildings;
      newBuildings[building].count += 1;

      this.setState((state) => ({
        buildings: newBuildings,
        unlocks: [...state.unlocks, building],
        currentEmissions: state.currentEmissions - cost,
      }));
    }
  }

  render() {
    return (
      <div className="h-screen w-screen overflow-hidden">
        <div className="bg-metal-plates flex w-full items-center justify-between py-4 px-6">
          <h1 className="text-shadow font-sans text-5xl font-bold text-white">Burn It All</h1>
          <button
            className="inline-block rounded bg-red-600 px-5 py-2.5 text-sm font-medium uppercase leading-tight text-white shadow-md transition duration-150 ease-in-out hover:bg-red-700 hover:shadow-lg focus-visible:bg-red-700 focus-visible:shadow-lg active:bg-red-800 active:shadow-lg"
            onClick={this.clearLocal}
          >
            Reset
          </button>
        </div>
        <div className="bg-warning-pattern-horizontal h-4" />
        <div className="flex h-full w-full grid-cols-5">
          <div className="flex h-full w-1/5 min-w-max flex-col items-center p-8">
            <EmissionsCounter
              emissions={this.state.currentEmissions}
              production={this.productionHandler.getBuildingsProduction(this.state.buildings, 1000)}
              lang={this.state.lang}
            />
            <BigRedButton
              onClick={() => this.addEmissions(this.productionHandler.getClickerProduction())}
            />
          </div>
          <div className="bg-warning-pattern min-w-4" />
          <div className="min-w-0 flex-grow overflow-hidden overflow-y-auto after:block after:h-16">
            <BuildingsDisplay
              buildings={this.state.buildings}
              upgrades={this.state.upgrades}
              lang={this.state.lang}
            />
          </div>
          <div className="bg-warning-pattern min-w-4" />
          <div className="bg-dirty-brick-wall w-1/4 min-w-[25%] overflow-y-auto p-2 after:block after:h-44">
            <h2 className="font-header text-center text-3xl">Shop!</h2>
            <h3 className="pt-2 text-2xl">Upgrades</h3>
            <UpgradeList
              upgrades={this.state.upgrades}
              unlocks={this.state.unlocks}
              totalEmissions={this.state.totalEmissions}
              currentEmissions={this.state.currentEmissions}
              onPurchase={this.onUpgradePurchase}
              lang={this.state.lang}
            />
            <h3 className="pt-2 text-2xl">Buildings</h3>
            <BuildingStore
              buildings={this.state.buildings}
              getProduction={this.getSingleBuildingProduction}
              totalEmissions={this.state.totalEmissions}
              currentEmissions={this.state.currentEmissions}
              onPurchase={this.onBuildingPurchase}
              lang={this.state.lang.buildings}
            />
          </div>
        </div>
      </div>
    );
  }
}
