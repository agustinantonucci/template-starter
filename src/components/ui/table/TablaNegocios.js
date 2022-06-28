import {
  Table,
  Tag,
  Space,
  Input,
  Button,
  Card,
  Popover,
  Divider,
  Tooltip,
} from "antd";
import {
  DislikeOutlined,
  LikeOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import "./index.css";
import { useState, useRef, useEffect } from "react";
import { useQuery } from "@apollo/client";
import { GET_NEGOCIOS } from "../../../graphql/query/Negocios";
import { GET_CONFIGURACION } from "../../../graphql/query/Configuracion";
import { GlobalContext } from "../../context/GlobalContext";
import { useContext } from "react";
import { conversorMonedas } from "../../../helpers/conversorMonedas";
import Info from "./Info";
import { infoCotizacion } from "./InfoCotizacion";

const TablaNegocios = () => {
  const url = window.location.search;
  const urlParameter = url.split("=");
  const idCliente = urlParameter[1];

  const searchInput = useRef(null);
  const [listadoNegocios, setListadoNegocios] = useState([]);
  const [listadoNegociosFiltrados, setListadoNegociosFiltrados] = useState([]);
  const [listadoEtiquetas, setListadoEtiquetas] = useState([]);
  const [totalNegocio, setTotalNegocio] = useState([]);
  const [totalEtapa, setTotalEtapa] = useState([]);
  const [cantAbiertos, setCantAbiertos] = useState([]);
  const [cantGanados, setCantGanados] = useState([]);
  const [cantPerdidos, setCantPerdidos] = useState([]);
  const [pipelines, setPipelines] = useState([]);
  const [tipoFiltro, setTipoFiltro] = useState("abierto");
  const [monIsoBase, setMonIsoBase] = useState([]);

  const { cotizacionDolar, cotizacionReal, ultimaActualizacion } =
    useContext(GlobalContext);

  const { data, loading, error } = useQuery(GET_NEGOCIOS, {
    variables: { idCliente: Number(idCliente) },
  });

  const { data: getConfiguracion } = useQuery(GET_CONFIGURACION);

  useEffect(() => {
    if (data && getConfiguracion) {
      const dataConfig = JSON.parse(getConfiguracion.getConfiguracionResolver);
      const negocios = JSON.parse(data.getNegociosIframeResolver);

      setListadoNegocios(negocios.dataNeg);
      setListadoNegociosFiltrados(negocios.dataNeg);
      setListadoEtiquetas(negocios.dataTags);
      setPipelines(
        negocios.dataPipelines.map((item) => {
          return { text: item.pip_nombre, value: item.pip_nombre };
        })
      );
      let sumaEtapa = 0;

      let conteoAbiertos = 0;
      let conteoGanados = 0;
      let conteoPerdidos = 0;

      let totalNegocios = 0;

      negocios.dataNeg.map((element) => {
        element.neg_estado === 0
          ? conteoAbiertos++
          : element.neg_estado === 1
          ? conteoGanados++
          : conteoPerdidos++;

        const elemento = element;

        const monedaDefecto = dataConfig[0].mon_id;

        const { nuevoImporte } = conversorMonedas(
          elemento,
          monedaDefecto,
          cotizacionDolar,
          cotizacionReal
        );

        sumaEtapa += (nuevoImporte * element.eta_avance) / 100;
        totalNegocios += nuevoImporte;

        setTotalNegocio(totalNegocios);
        setTotalEtapa(sumaEtapa);
        setCantAbiertos(conteoAbiertos);
        setCantGanados(conteoGanados);
        setCantPerdidos(conteoPerdidos);
        setMonIsoBase(dataConfig[0].mon_iso);
      });
    }
  }, [data, getConfiguracion]);

  const getColumnSearchProps = (dataIndex) => ({
    filterDropdown: ({
      setSelectedKeys,
      selectedKeys,
      confirm,
      clearFilters,
    }) => (
      <div
        style={{
          padding: 8,
        }}
      >
        <Input
          ref={searchInput}
          placeholder={"Buscar negocio"}
          value={selectedKeys[0]}
          onChange={(e) =>
            setSelectedKeys(e.target.value ? [e.target.value] : [])
          }
          onPressEnter={() => handleSearch(selectedKeys, confirm, dataIndex)}
          style={{
            marginBottom: 8,
            display: "block",
          }}
        />
        <Space>
          <Button
            type="primary"
            onClick={() => handleSearch(selectedKeys, confirm, dataIndex)}
            icon={<SearchOutlined />}
            size="small"
            style={{
              width: 90,
            }}
          >
            Buscar
          </Button>
          <Button
            onClick={() => clearFilters && handleReset(clearFilters)}
            size="small"
            style={{
              width: 90,
            }}
          >
            Reiniciar
          </Button>
        </Space>
      </div>
    ),
    filterIcon: (filtered) => (
      <SearchOutlined
        style={{
          color: filtered ? "#1890ff" : undefined,
        }}
      />
    ),
    onFilter: (value, record) =>
      record[dataIndex]
        ? record[dataIndex]
            .toString()
            .toLowerCase()
            .includes(value.toLowerCase())
        : "",
    // onFilter: (value, record) =>
    //   record[dataIndex].toString().toLowerCase().includes(value.toLowerCase()),
    // onFilterDropdownVisibleChange: (visible) => {
    //   if (visible) {
    //     setTimeout(() => searchInput.current?.select(), 100);
    //   }
    // },
  });

  const getDate = (date) => {
    const fecha = date.split("T");

    return fecha[0].split("-").reverse().join("/");
  };

  const columns = [
    {
      title: "Embudo",
      dataIndex: "pip_nombre",
      key: "pip_nombre",
      filters: pipelines,
      onFilter: (value, record) => {
        return record.pip_nombre === value;
      },
    },
    {
      title: "Etapa",
      dataIndex: "eta_nombre",
      key: "eta_nombre",
    },
    {
      title: "Negocio",
      dataIndex: "neg_asunto",
      key: "neg_asunto",
      ...getColumnSearchProps("neg_asunto"),
      render: (dataIndex, item) => {
        const etiquetasNegocios = listadoEtiquetas.filter(
          (x) => x.neg_id === item.neg_id
        );
        return (
          <>
            {dataIndex}
            <div
              className={etiquetasNegocios.length > 0 ? "div-contenedor" : ""}
            >
              {etiquetasNegocios.map((element, idx) => {
                return (
                  <Popover
                    key={idx}
                    content={etiquetasNegocios.map((element) => {
                      return (
                        <Tag color={element.etq_color} key={element.etq_id}>
                          {element.etq_nombre}
                        </Tag>
                      );
                    })}
                  >
                    <Tag
                      color={element.etq_color}
                      key={element.etq_id}
                      className="tags"
                    ></Tag>
                  </Popover>
                );
              })}
            </div>
          </>
        );
      },
    },
    {
      title: "Importe",
      dataIndex: "neg_valor",
      key: "neg_valor",
      align: "right",
      sorter: (a, b) => a.neg_valor - b.neg_valor,
      render: (dataIndex, item) => (
        <>{`${item.mon_iso} ${dataIndex.toLocaleString("de-DE", {
          minimumFractionDigits: 0,
        })}`}</>
      ),
    },
    {
      title: "% Etapa",
      dataIndex: "eta_avance",
      key: "eta_avance",
      align: "right",
      sorter: (a, b) => a.eta_avance - b.eta_avance,
    },
    {
      title: "Fecha de Creación",
      dataIndex: "neg_fechacreacion",
      key: "neg_fechacreacion",
      align: "center",
      sorter: (a, b) => a.neg_fechacreacion.localeCompare(b.neg_fechacreacion),
      // sorter: (a, b) =>
      //   new Date(moment(a.neg_fechacreacion, "Do MMMM YYYY").format("L")) -
      //   new Date(moment(b.neg_fechacreacion, "Do MMMM YYYY").format("L")),
      render: (dataIndex) => getDate(dataIndex),
    },
    {
      title: "Fecha de Cierre",
      dataIndex: "neg_fechacierre",
      key: "neg_fechacierre",
      align: "center",
      sorter: (a, b) => a.neg_fechacierre.localeCompare(b.neg_fechacierre),
      // sorter: (a, b) =>
      //   new Date(moment(a.neg_fechacierre, "Do MMMM YYYY").format("L")) -
      //   new Date(moment(b.neg_fechacierre, "Do MMMM YYYY").format("L")),
      render: (dataIndex) => getDate(dataIndex),
    },
    {
      title: "...",
      key: "tipoCerrado",
      align: "center",
      render: (dataIndex, item) => {
        return (
          <span>
            {tipoFiltro === "cerrado" ? (
              <>
                {item.neg_estado === 1 && (
                  <Tooltip title="Cerrado Ganado" placement="left">
                    <LikeOutlined style={{ color: "green" }} />
                  </Tooltip>
                )}
                {item.neg_estado === 2 && (
                  <Tooltip title="Cerrado Perdido" placement="left">
                    <DislikeOutlined style={{ color: "red" }} />
                  </Tooltip>
                )}
              </>
            ) : null}
          </span>
        );
      },
    },
  ];

  const handleClickEstado = (estado) => {
    setTipoFiltro(estado);
    if (estado === "abierto") {
      setListadoNegociosFiltrados(
        listadoNegocios.filter((x) => x.neg_estado === 0)
      );
    } else if (estado === "cerrado") {
      setListadoNegociosFiltrados(
        listadoNegocios.filter((x) => x.neg_estado !== 0)
      );
    } else {
      setListadoNegociosFiltrados(listadoNegocios);
    }
  };

  const handleSearch = (selectedKeys, confirm, dataIndex) => {
    confirm();
  };

  const handleReset = (clearFilters) => {
    clearFilters();
  };

  return (
    <>
      <div className="card-wrapper">
        <div className="card-contadores">
          <div
            className={tipoFiltro === "total" ? "div-secundario dashed" : "div-secundario"}
            style={{ cursor: "pointer" }}
            onClick={() => {
              handleClickEstado("total");
            }}
          >
            <p className="texto">NEGOCIOS</p>
            <p className="numeros">{cantAbiertos + cantGanados + cantPerdidos}</p>
          </div>
          <Divider
            type="vertical"
            style={{
              height: "100%",
              borderColor: "#f0f0f0",
              borderWidth: "2px",
            }}
          />
          <div>
            <div
              className={tipoFiltro === "abierto" ? "div-secundario dashed" : "div-secundario"}
              style={{ cursor: "pointer" }}
              onClick={() => {
                handleClickEstado("abierto");
              }}
            >
              <p className="texto">ABIERTOS</p>
              <p className="numeros">{cantAbiertos}</p>
            </div>
            <hr className="hr1" />
            <div
              className={tipoFiltro === "cerrado" ? "div-secundario dashed" : "div-secundario"}
              style={{ cursor: "pointer" }}
              onClick={() => handleClickEstado("cerrado")}
            >
              <p className="texto">CERRADOS</p>
              <p className="numeros">{cantGanados + cantPerdidos}</p>
            </div>
          </div>
        </div>
        <Card className="card-content">
          <div className="div-content">
            <p className="totales">
              {`U$D ${totalNegocio.toLocaleString("de-DE", {
                minimumFractionDigits: 0,
              })}`}
            </p>
            <p className="descripcion">Total negocios</p>
          </div>
        </Card>
        <Card className="card-content">
          <div className="div-content">
            <p className="totales">
              {`U$D ${totalEtapa.toLocaleString("de-DE", {
                minimumFractionDigits: 0,
              })}`}
            </p>
            <p className="descripcion">Total % por etapa</p>
          </div>
        </Card>
        <div className="filter-data">
          <Info placement={"left"} title={`Cotización ${monIsoBase}`}>
            {infoCotizacion(
              monIsoBase,
              cotizacionDolar,
              cotizacionReal,
              ultimaActualizacion
            )}
          </Info>
        </div>
      </div>
      <Table
        rowKey={"neg_id"}
        size={"small"}
        dataSource={listadoNegociosFiltrados}
        columns={columns}
        pagination={{
          position: ["none", "bottomCenter"],
        }}
      />
    </>
  );
};

export default TablaNegocios;
