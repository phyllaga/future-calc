import React from 'react';
import ContractFormulaCalculator from './ContractFormulaCalculator';

function App() {
  return (
    <div className="container mx-auto py-8">
      <header className="text-center mb-8">
        <h1 className="text-2xl font-bold">行情测试工具</h1>
      </header>
      <ContractFormulaCalculator />
    </div>
  );
}

export default App;
