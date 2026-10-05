import React, { useState, useMemo } from 'react';
import {
  Database,
  Search,
  SlidersHorizontal,
  FileCode2,
  Layers,
  Copy,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Tag,
  Boxes,
  Activity,
  HardDrive
} from 'lucide-react';
import {
  CATALOG_RECORDS,
  EVENT_TOPIC_RECORDS,
  DATASTORE_RECORDS,
  DATASET_STATS,
  CatalogRecord,
  EventTopicRecord,
  DatastoreRecord,
} from '../data/overviewDataset';

interface DatasetOverviewProps {
  onSelectProduct?: (productId: string) => void;
  onEnterStore?: () => void;
}

type TabType = 'catalog' | 'events' | 'datastores';

export const DatasetOverview: React.FC<DatasetOverviewProps> = ({
  onSelectProduct,
  onEnterStore,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('catalog');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const categories = useMemo(() => {
    const set = new Set(CATALOG_RECORDS.map((c) => c.category));
    return ['All', ...Array.from(set)];
  }, []);

  const filteredCatalog = useMemo(() => {
    return CATALOG_RECORDS.filter((item) => {
      const matchesCategory =
        selectedCategory === 'All' || item.category === selectedCategory;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        item.origin.toLowerCase().includes(q) ||
        item.material.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, selectedCategory]);

  const filteredEvents = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return EVENT_TOPIC_RECORDS.filter(
      (ev) =>
        ev.topic.toLowerCase().includes(q) ||
        ev.producer.toLowerCase().includes(q) ||
        ev.purpose.toLowerCase().includes(q) ||
        ev.routingKey.toLowerCase().includes(q) ||
        ev.consumers.some((c) => c.toLowerCase().includes(q))
    );
  }, [searchQuery]);

  const filteredDatastores = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return DATASTORE_RECORDS.filter(
      (ds) =>
        ds.service.toLowerCase().includes(q) ||
        ds.engine.toLowerCase().includes(q) ||
        ds.storageTarget.toLowerCase().includes(q) ||
        ds.paradigm.toLowerCase().includes(q) ||
        ds.primaryTablesOrCollections.some((t) => t.toLowerCase().includes(q))
    );
  }, [searchQuery]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleExpand = (rowId: string) => {
    setExpandedRow((prev) => (prev === rowId ? null : rowId));
  };

  return (
    <section className="bg-white rounded-xl border border-[#E8E1D6] p-6 sm:p-10 shadow-soft space-y-8">
      {/* Header and Introduction */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FAF0EB] text-[#C1440E] text-[11px] font-semibold uppercase tracking-wider mb-2">
            <Database className="w-3.5 h-3.5" />
            <span>Dataset & Schema Explorer</span>
          </div>
          <h2 className="font-serif text-3xl font-medium text-[#1F1B16]">
            Platform Datasets & Architecture Specifications
          </h2>
          <p className="text-xs sm:text-sm text-[#6B6459] mt-1 max-w-2xl leading-relaxed">
            Inspect the underlying datasets powering ShopSphere: explore physical inventory SKUs, synchronous MongoDB and PostgreSQL data entities, and asynchronous RabbitMQ event payload contracts.
          </p>
        </div>

        {/* Dataset Tab Switchers */}
        <div className="flex items-center gap-1 p-1 bg-[#FAF7F2] rounded-lg border border-[#E8E1D6] self-start md:self-auto overflow-x-auto no-scrollbar">
          <button
            onClick={() => {
              setActiveTab('catalog');
              setSearchQuery('');
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'catalog'
                ? 'bg-[#1F1B16] text-[#FAF7F2] shadow-sm'
                : 'text-[#6B6459] hover:text-[#1F1B16]'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>Artisan Catalog ({CATALOG_RECORDS.length})</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('events');
              setSearchQuery('');
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'events'
                ? 'bg-[#1F1B16] text-[#FAF7F2] shadow-sm'
                : 'text-[#6B6459] hover:text-[#1F1B16]'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Event Payloads ({EVENT_TOPIC_RECORDS.length})</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('datastores');
              setSearchQuery('');
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'datastores'
                ? 'bg-[#1F1B16] text-[#FAF7F2] shadow-sm'
                : 'text-[#6B6459] hover:text-[#1F1B16]'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Storage Targets ({DATASTORE_RECORDS.length})</span>
          </button>
        </div>
      </div>

      {/* Dataset KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-[#FAF7F2] rounded-lg border border-[#E8E1D6]">
          <span className="text-[11px] uppercase tracking-wider text-[#6B6459] font-medium block">
            Catalog SKUs
          </span>
          <span className="font-serif text-2xl font-bold text-[#1F1B16] mt-0.5 block">
            {DATASET_STATS.totalCatalogProducts}
          </span>
          <span className="text-[10px] text-[#3D6B4C] font-mono">
            Across {DATASET_STATS.totalCategories} workshop categories
          </span>
        </div>

        <div className="p-4 bg-[#FAF7F2] rounded-lg border border-[#E8E1D6]">
          <span className="text-[11px] uppercase tracking-wider text-[#6B6459] font-medium block">
            Stock Reservoir
          </span>
          <span className="font-serif text-2xl font-bold text-[#1F1B16] mt-0.5 block">
            {DATASET_STATS.totalStockUnits}
          </span>
          <span className="text-[10px] text-amber-700 font-mono">
            Tracked in MongoDB with atomic locks
          </span>
        </div>

        <div className="p-4 bg-[#FAF7F2] rounded-lg border border-[#E8E1D6]">
          <span className="text-[11px] uppercase tracking-wider text-[#6B6459] font-medium block">
            Average Valuation
          </span>
          <span className="font-serif text-2xl font-bold text-[#C1440E] mt-0.5 block">
            ${DATASET_STATS.averagePrice}
          </span>
          <span className="text-[10px] text-[#6B6459] font-mono">
            Mean item rating: ★ {DATASET_STATS.averageRating} / 5.0
          </span>
        </div>

        <div className="p-4 bg-[#FAF7F2] rounded-lg border border-[#E8E1D6]">
          <span className="text-[11px] uppercase tracking-wider text-[#6B6459] font-medium block">
            Event Topic Routes
          </span>
          <span className="font-serif text-2xl font-bold text-[#1F1B16] mt-0.5 block">
            {DATASET_STATS.eventTopicCount}
          </span>
          <span className="text-[10px] text-blue-600 font-mono">
            AMQP 0-9-1 topic exchanges
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6459]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeTab === 'catalog'
                ? 'Filter by SKU, name, material, origin...'
                : activeTab === 'events'
                ? 'Search event topic, producer, consumer...'
                : 'Filter storage target or database engine...'
            }
            className="w-full pl-9 pr-3 py-2 text-xs bg-[#FAF7F2] border border-[#E8E1D6] rounded-md text-[#1F1B16] placeholder-[#6B6459] focus:outline-none focus:border-[#C1440E]"
          />
        </div>

        {activeTab === 'catalog' && (
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            <SlidersHorizontal className="w-3 h-3 text-[#6B6459] flex-shrink-0" />
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-full transition-all whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-[#1F1B16] text-[#FAF7F2]'
                    : 'bg-[#FAF7F2] text-[#6B6459] border border-[#E8E1D6] hover:border-[#1F1B16]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Dataset Content Section 1: Artisan Goods Catalog */}
      {activeTab === 'catalog' && (
        <div className="border border-[#E8E1D6] rounded-lg overflow-hidden bg-white shadow-soft">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF7F2] border-b border-[#E8E1D6] text-[#6B6459] font-medium">
                <tr>
                  <th className="py-3 px-4">SKU / ID</th>
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Origin & Material</th>
                  <th className="py-3 px-4">Price</th>
                  <th className="py-3 px-4">Inventory</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E1D6]">
                {filteredCatalog.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-[#6B6459]">
                      No items matched your search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredCatalog.map((item) => {
                    const isExpanded = expandedRow === item.id;
                    return (
                      <React.Fragment key={item.id}>
                        <tr className="hover:bg-[#FDFBF7] transition-colors">
                          <td className="py-3 px-4 font-mono text-[11px] text-[#C1440E] font-medium">
                            {item.sku}
                          </td>
                          <td className="py-3 px-4 font-serif font-medium text-[#1F1B16]">
                            <div className="flex items-center gap-1.5">
                              <span>{item.name}</span>
                              {item.editorialTag && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-sans font-medium bg-[#FAF0EB] text-[#C1440E] border border-[#F3D5B5]">
                                  {item.editorialTag}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-[#6B6459]">
                            {item.category}
                          </td>
                          <td className="py-3 px-4 text-[#6B6459]">
                            <div>{item.origin}</div>
                            <div className="text-[10px] text-[#8C827A] truncate max-w-xs">{item.material}</div>
                          </td>
                          <td className="py-3 px-4 font-mono font-semibold text-[#1F1B16]">
                            ${item.price.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-[#6B6459]">
                            <span className="font-mono">{item.stock}</span> units
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                item.status === 'In Stock'
                                  ? 'bg-[#EBF3ED] text-[#3D6B4C]'
                                  : 'bg-[#FFF8E6] text-amber-700'
                              }`}
                            >
                              {item.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => toggleExpand(item.id)}
                                title="Inspect Item Metadata"
                                className="p-1.5 text-[#6B6459] hover:text-[#1F1B16] rounded border border-[#E8E1D6] hover:bg-[#FAF7F2]"
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-3.5 h-3.5" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5" />
                                )}
                              </button>
                              {onEnterStore && (
                                <button
                                  onClick={onEnterStore}
                                  title="View In Storefront"
                                  className="p-1.5 text-[#C1440E] hover:text-[#9C360B] rounded border border-[#E8E1D6] hover:bg-[#FAF0EB]"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* Expandable Metadata Detail Drawer */}
                        {isExpanded && (
                          <tr className="bg-[#FAF7F2]/80">
                            <td colSpan={8} className="py-4 px-6 text-xs text-[#6B6459]">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-l-2 border-l-[#C1440E] pl-4">
                                <div>
                                  <span className="font-semibold block text-[#1F1B16] mb-1">
                                    Inventory & Shipping Specs
                                  </span>
                                  <p>Lead Time: <span className="font-medium text-[#1F1B16]">{item.leadTime}</span></p>
                                  <p>Rating: <span className="font-medium text-[#1F1B16]">★ {item.rating} / 5.0</span></p>
                                  <p>Database ID: <code className="text-[10px]">{item.id}</code></p>
                                </div>
                                <div className="md:col-span-2">
                                  <span className="font-semibold block text-[#1F1B16] mb-1">
                                    Craftsmanship & Provenance
                                  </span>
                                  <p className="text-[11px] leading-relaxed">
                                    Authentic hand-finished creation from <strong className="text-[#1F1B16]">{item.origin}</strong> using {item.material}. Stored in MongoDB collection <code>shopsphere_product.products</code> with cache-aside in Redis key <code>products:detail:{item.id}</code>.
                                  </p>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="p-3 bg-[#FAF7F2] border-t border-[#E8E1D6] flex justify-between items-center text-[11px] text-[#6B6459]">
            <span>Showing {filteredCatalog.length} of {CATALOG_RECORDS.length} records</span>
            <span className="font-mono">Collection: shopsphere_product.products</span>
          </div>
        </div>
      )}

      {/* Dataset Content Section 2: Event Topic Schemas */}
      {activeTab === 'events' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredEvents.map((ev) => {
              const isExpanded = expandedRow === ev.topic;
              const jsonString = JSON.stringify(ev.samplePayload, null, 2);
              return (
                <div
                  key={ev.topic}
                  className="p-5 bg-[#FAF7F2] rounded-lg border border-[#E8E1D6] space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-[#FAF0EB] text-[#C1440E] border border-[#F3D5B5]">
                        {ev.topic}
                      </span>
                      <span className="text-[10px] font-mono text-[#3D6B4C] bg-white px-2 py-0.5 rounded border border-[#E8E1D6]">
                        SLA: {ev.sla}
                      </span>
                    </div>

                    <p className="text-xs text-[#1F1B16] leading-relaxed">
                      {ev.purpose}
                    </p>

                    <div className="space-y-1 text-[11px] text-[#6B6459] pt-1">
                      <div>
                        <strong className="text-[#1F1B16]">Producer:</strong> {ev.producer}
                      </div>
                      <div>
                        <strong className="text-[#1F1B16]">Exchange:</strong>{' '}
                        <code className="text-[10px]">{ev.exchange}</code> ({ev.exchangeType})
                      </div>
                      <div>
                        <strong className="text-[#1F1B16]">Consumers:</strong>{' '}
                        {ev.consumers.join(', ')}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#E8E1D6]">
                    <div className="flex items-center justify-between mb-2">
                      <button
                        onClick={() => toggleExpand(ev.topic)}
                        className="text-[11px] text-[#C1440E] font-medium flex items-center gap-1 hover:underline"
                      >
                        <FileCode2 className="w-3.5 h-3.5" />
                        <span>{isExpanded ? 'Hide Payload Contract' : 'Inspect JSON Payload Contract'}</span>
                      </button>

                      {isExpanded && (
                        <button
                          onClick={() => handleCopy(ev.topic, jsonString)}
                          className="flex items-center gap-1 text-[10px] text-[#6B6459] hover:text-[#1F1B16]"
                        >
                          {copiedId === ev.topic ? (
                            <>
                              <Check className="w-3 h-3 text-[#3D6B4C]" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy JSON</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    {isExpanded && (
                      <pre className="p-3 bg-[#1F1B16] text-[#FAF7F2] rounded-md font-mono text-[10px] overflow-x-auto leading-relaxed">
                        {jsonString}
                      </pre>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Dataset Content Section 3: Datastores and Topology */}
      {activeTab === 'datastores' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDatastores.map((ds, i) => (
            <div
              key={i}
              className="p-5 bg-[#FAF7F2] rounded-lg border border-[#E8E1D6] space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-base font-medium text-[#1F1B16]">
                  {ds.service}
                </h3>
                <span className="px-2 py-0.5 font-mono text-[10px] bg-white border border-[#E8E1D6] rounded text-[#6B6459]">
                  Port: {ds.port}
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#6B6459]">Engine:</span>
                  <span className="font-medium text-[#1F1B16]">{ds.engine}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B6459]">Database Target:</span>
                  <code className="text-[#C1440E] text-[11px] font-mono">{ds.storageTarget}</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B6459]">Paradigm:</span>
                  <span className="text-[#1F1B16]">{ds.paradigm}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B6459]">Consistency Model:</span>
                  <span className="text-[#3D6B4C] text-[11px] font-medium">{ds.consistency}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-[#E8E1D6]">
                <span className="block text-[10px] uppercase font-semibold tracking-wider text-[#6B6459] mb-1.5">
                  Core Tables / Collections
                </span>
                <div className="flex flex-wrap gap-1">
                  {ds.primaryTablesOrCollections.map((t, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded text-[10px] font-mono bg-white border border-[#E8E1D6] text-[#1F1B16]"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
